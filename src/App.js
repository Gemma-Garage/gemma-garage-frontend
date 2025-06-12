import React, { useState, useEffect, useRef } from "react";
import { Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import GetAppIcon from "@mui/icons-material/GetApp";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { auth } from "./firebase";

// Import our API endpoints
import { API_BASE_URL } from "./api";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

import Header from "./components/Header";
import UploadDataset from "./components/UploadDataset";
import TrainingParameters from "./components/TrainingParameters";
import FinetuneControl from "./components/FinetuneControl";
import LossGraph from "./components/LossGraph";
// import Sidebar from "./components/Sidebar"; // No longer using Sidebar component directly here
import TestLLM from "./components/TestLLM";
import DatasetPreview from "./components/DatasetPreview";
import Footer from "./components/Footer";
import AuthPage from "./components/AuthPage";
import ProjectDashboard from "./components/ProjectDashboard";
import CreateProjectDialog from "./components/CreateProjectDialog";
import "./style/App.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function App() {
  const [datasetFile, setDatasetFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [modelName, setModelName] = useState("google/gemma-3-1b-pt");
  const [epochs, setEpochs] = useState(1);
  const [learningRate, setLearningRate] = useState(0.0002);
  const [loraRank, setLoraRank] = useState(4);
  const [trainingStatus, setTrainingStatus] = useState("");
  const [lossData, setLossData] = useState([]);
  const [weightsUrl, setWeightsUrl] = useState(null);
  const [currentRequestId, setCurrentRequestId] = useState(null);
  const [lastLogTimestamp, setLastLogTimestamp] = useState(null);
  const pollingIntervalRef = useRef(null);
  const [progress, setProgress] = useState({ current_step: 0, total_steps: 0, current_epoch: 0, total_epochs: 0 });
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isUserSetupComplete, setIsUserSetupComplete] = useState(false);
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedProjectData, setSelectedProjectData] = useState(null);
  const [trainableDatasetName, setTrainableDatasetName] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsUserSetupComplete(false);
      if (user) {
        setCurrentUser(user);
        console.log("[AUTH_STATE_CHANGE] User signed in:", user.uid);
        console.log("[AUTH_STATE_CHANGE] Firestore 'db' instance:", db);

        try {
          console.log("[USER_DOC_LOGIC] Attempting to get/create user document for:", user.uid);
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (!userDocSnap.exists()) {
            console.log("[USER_DOC_LOGIC] User document does not exist for " + user.uid + ". Creating now.");
            await setDoc(userDocRef, {
              email: user.email,
              createdAt: serverTimestamp(),
            });
            console.log("[USER_DOC_LOGIC] User document created in Firestore for new user:", user.uid);
          } else {
            console.log("[USER_DOC_LOGIC] User document already exists for:", user.uid, userDocSnap.data());
          }
          setIsUserSetupComplete(true);
        } catch (e) {
          console.error("[FIRESTORE_CATCH_BLOCK] Caught something in onAuthStateChanged user setup!");
          console.error("[FIRESTORE_CATCH_BLOCK] Error object:", e);
          console.error("[FIRESTORE_CATCH_BLOCK] Error message:", e.message);
          console.error("[FIRESTORE_CATCH_BLOCK] Error code:", e.code);
          console.error("[FIRESTORE_CATCH_BLOCK] Error name:", e.name);
          setIsUserSetupComplete(false);
        } finally {
          setLoadingAuth(false);
        }
      } else {
        console.log("[AUTH_STATE_CHANGE] User signed out.");
        setCurrentUser(null);
        setSelectedProjectId(null);
        setSelectedProjectData(null);
        setDatasetFile(null);
        setUploadStatus("");
        setTrainableDatasetName(null);
        setModelName("google/gemma-3-1b-pt");
        setEpochs(1);
        setLearningRate(0.0002);
        setLoraRank(4);
        setTrainingStatus("");
        setLossData([]);
        setWeightsUrl(null);
        setCurrentRequestId(null);
        setLastLogTimestamp(null);
        setProgress({ current_step: 0, total_steps: 0, current_epoch: 0, total_epochs: 0 });
        setLoadingAuth(false);
        setIsUserSetupComplete(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleCreateProjectOpen = () => {
    setShowCreateProjectDialog(true);
  };

  const handleCreateProjectClose = () => {
    setShowCreateProjectDialog(false);
  };

  const handleCreateProject = async (projectName) => {
    if (!currentUser) {
      alert("You must be logged in to create a project.");
      return;
    }
    try {
      const projectsCollectionRef = collection(db, "users", currentUser.uid, "projects");
      const newProjectRef = await addDoc(projectsCollectionRef, {
        displayName: projectName,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        requestId: null,
        baseModel: modelName,
        weightsUrl: null,
        lastTrainedAt: null,
        epochs: parseInt(epochs, 10),
        learningRate: parseFloat(learningRate),
        loraRank: parseInt(loraRank, 10),
        trainingStatusMessage: "Project created. Ready for training."
      });
      console.log("Project created successfully with ID:", newProjectRef.id, " Name:", projectName);
      handleCreateProjectClose();
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project: " + error.message);
    }
  };
  
  const handleProjectSelect = async (projectId) => {
    if (!currentUser || !projectId) {
      setSelectedProjectId(null);
      setSelectedProjectData(null);
      setTrainableDatasetName(null); 
      return;
    }
    
    setLoadingAuth(true);
    try {
      const projectDocRef = doc(db, "users", currentUser.uid, "projects", projectId);
      const projectDocSnap = await getDoc(projectDocRef);

      if (projectDocSnap.exists()) {
        const projectData = { id: projectDocSnap.id, ...projectDocSnap.data() };
        setSelectedProjectData(projectData);
        setSelectedProjectId(projectId);

        setDatasetFile(null); 
        setUploadStatus("");
        setTrainableDatasetName(projectData.trainableDatasetName || null); // Load if saved
        
        setEpochs(projectData.epochs || epochs); 
        setLearningRate(projectData.learningRate || learningRate);
        setLoraRank(projectData.loraRank || loraRank);
        
        setTrainingStatus(projectData.trainingStatusMessage || (projectData.requestId ? "Project data loaded." : "Ready for training."));
        setLossData(projectData.lossData || []); 
        setWeightsUrl(projectData.weightsUrl || null);
        setCurrentRequestId(projectData.requestId || null);
        setLastLogTimestamp(null); 
        setProgress({ current_step: 0, total_steps: 0, current_epoch: 0, total_epochs: 0 }); 
        setModelName(projectData.baseModel || modelName); 

        if (projectData.requestId && projectData.weightsUrl) {
          setTrainingStatus(projectData.trainingStatusMessage || `Training completed for project '${projectData.displayName}'. Model is available.`);
        } else if (projectData.requestId) {
          setTrainingStatus(projectData.trainingStatusMessage || `Training for project '${projectData.displayName}' was previously initiated (ID: ${projectData.requestId}). Check status or start new training.`);
        }

      } else {
        console.error("Selected project not found in Firestore:", projectId);
        alert("Error: Could not load project data. The project may have been deleted.");
        setSelectedProjectData(null);
        setSelectedProjectId(null); 
      }
    } catch (error) {
      console.error("Error selecting project:", error);
      alert("Error loading project data: " + error.message);
      setSelectedProjectData(null);
      setSelectedProjectId(null);
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadStatus("");
      setTrainableDatasetName(null);
      
      const fileExt = file.name.split('.').pop().toLowerCase();
      if (!['json', 'csv', 'pdf'].includes(fileExt)) {
        alert("Please upload a JSON, CSV, or PDF file.");
        return;
      }
      
      setDatasetFile(file);
    }
  };

  const uploadDataset = async () => { // Changed: No longer takes 'file' as an argument
    if (!datasetFile) { // Changed: Uses datasetFile from state
      console.error("No file selected");
      alert("Please select a file to upload."); // User-facing alert
      setUploadStatus("No file selected."); // Update status
      return;
    }

    const formData = new FormData();
    formData.append("file", datasetFile); // Changed: Uses datasetFile from state

    setUploadStatus("Uploading..."); // Feedback for user

    try {
      const response = await fetch(`${API_BASE_URL}/dataset/upload`, {
        method: "POST",
        body: formData,
        // Headers might be needed depending on backend setup, e.g., for auth
        // headers: {
        //   // 'Authorization': `Bearer ${token}`, // If using token auth
        // },
      });

      if (!response.ok) {
        // Try to get error message from backend
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          // If response is not JSON, use status text
          errorData = { message: response.statusText };
        }
        const errorMessage = errorData.detail || errorData.message || "Unknown error";
        setUploadStatus(`Error: ${errorMessage}`); // Update status with error
        throw new Error(
          `HTTP error! status: ${response.status}, Message: ${errorMessage}`
        );
      }

      const data = await response.json(); 

      console.log("Dataset uploaded successfully:", data);
      
      if (data.file_location) {
        const fileName = data.file_location.split('/').pop(); // Extract filename
        setUploadStatus(`Dataset '${fileName}' uploaded successfully. Ready for training.`); // User-friendly status
        console.log("File uploaded to:", data.file_location);

        // If the project is selected, update the project document in Firestore
        if (selectedProjectData && selectedProjectId && currentUser) { 
          const projectRef = doc(db, "users", currentUser.uid, "projects", selectedProjectId);
          await updateDoc(projectRef, {
            dataset_gcs_path: data.file_location, 
            dataset_filename: datasetFile.name,
            trainableDatasetName: data.file_location, // This is the GCS path
            updatedAt: serverTimestamp(),
          });
          console.log("Project document updated with dataset GCS path.");
          setTrainableDatasetName(data.file_location); // Set state with the GCS path
        }
      } else {
        console.error("File location not found in response:", data);
        setUploadStatus("Error: File location not found in response."); // Update status
      }
    } catch (error) {
      console.error("Error uploading dataset:", error);
      // Check if status was already set by HTTP error block
      if (!uploadStatus.startsWith("Error:")) {
        setUploadStatus("Error uploading dataset: " + error.message); // Update status
      }
    }
  };

  const stopPollingLogs = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log("Stopped polling for logs.");
    }
  };

  const pollLogs = async (requestId, sinceTimestamp) => {
    try {
      let url = `${API_BASE_URL}/finetune/logs/${requestId}`;
      if (sinceTimestamp) {
        url += `?since=${encodeURIComponent(sinceTimestamp)}`;
      }
    
      const response = await fetch(url);
      console.log("Polling logs from:", url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        console.error("Error fetching logs:", errorData.detail || response.statusText);
        setTrainingStatus(`Error fetching logs: ${errorData.detail || response.statusText}`);
        if (response.status === 404) {
            stopPollingLogs();
            setTrainingStatus("Training ID not found. Stopping log updates.");
        }
        return;
      }

      const data = await response.json();
      let latestStatusMessage = trainingStatus; 
      let trainingCompleted = false;
      let newWeightsUrl = weightsUrl;
      const newLossPointsForGraph = [];

      if (data.loss_values && Array.isArray(data.loss_values)) {
        for (const point of data.loss_values) { 
            if (point && point.status_message) {
                latestStatusMessage = point.status_message;
                
                const hasProgressInfo = point.current_step !== undefined ||
                                        point.total_steps !== undefined ||
                                        point.current_epoch !== undefined ||
                                        point.total_epochs !== undefined;

                if (hasProgressInfo) {
                    setProgress(prevProgress => {
                        const newProg = { ...prevProgress }; 

                        if (point.current_step !== undefined) {
                            newProg.current_step = point.current_step;
                        }
                        if (point.total_steps !== undefined) {
                            newProg.total_steps = point.total_steps;
                        }
                        if (point.current_epoch !== undefined) {
                            newProg.current_epoch = point.current_epoch;
                        }
                        if (point.total_epochs !== undefined) {
                            newProg.total_epochs = point.total_epochs;
                        }
                        return newProg;
                    });
                }
            }

            if (point && point.status === 'complete') {
                trainingCompleted = true;
                latestStatusMessage = point.status_message || "Training complete. Model saved.";
                newWeightsUrl = point.weights_url || null; 
                console.log("Training complete, weights URL:", newWeightsUrl);
                
                if (selectedProjectId && currentUser && currentRequestId === requestId) { 
                  const projectDocRef = doc(db, "users", currentUser.uid, "projects", selectedProjectId);
                  try {
                    await updateDoc(projectDocRef, { 
                      weightsUrl: newWeightsUrl, 
                      lastTrainedAt: serverTimestamp(),
                      trainingStatusMessage: latestStatusMessage,
                    });
                    console.log("Project updated in Firestore with training completion details:", selectedProjectId);
                  } catch (error) {
                    console.error("Error updating project in Firestore after training completion:", error);
                  }
                }
            }
            
            if (point && typeof point.loss === 'number' && point.current_epoch) {
              newLossPointsForGraph.push({
                current_epoch: point.current_epoch,
                time: new Date(point.timestamp).toLocaleTimeString(),
                loss: point.loss,
                rawTimestamp: point.timestamp
              });
            }
            
            if (point && point.message && typeof point.loss === 'undefined' && !point.status_message && point.status !== 'complete') {
                console.log("General log message:", point.message, point);
            }
        } 
        
        if (newLossPointsForGraph.length > 0) {
          setLossData(prevLossData => {
            const existingRawTimestamps = new Set(prevLossData.map(p => p.rawTimestamp));
            const uniqueNewPointsToPlot = newLossPointsForGraph.filter(p => !existingRawTimestamps.has(p.rawTimestamp));
            if (uniqueNewPointsToPlot.length > 0) {
                const combinedData = [...prevLossData, ...uniqueNewPointsToPlot];
                combinedData.sort((a, b) => new Date(a.rawTimestamp) - new Date(b.rawTimestamp));
                return combinedData;
            }
            return prevLossData;
          });
        }
      }
      
      setTrainingStatus(latestStatusMessage);

      if (data.latest_timestamp) {
        setLastLogTimestamp(data.latest_timestamp);
      } else if (newLossPointsForGraph.length > 0 && newLossPointsForGraph[newLossPointsForGraph.length - 1].rawTimestamp) {
        setLastLogTimestamp(newLossPointsForGraph[newLossPointsForGraph.length - 1].rawTimestamp);
      } else if (data.loss_values && data.loss_values.length > 0) {
        const lastLogEntry = data.loss_values[data.loss_values.length - 1];
        if (lastLogEntry && lastLogEntry.timestamp) {
            setLastLogTimestamp(lastLogEntry.timestamp);
        }
      }
      
      if (trainingCompleted) {
        stopPollingLogs();
        if (newWeightsUrl) {
          setWeightsUrl(newWeightsUrl);
        }
      }

    } catch (error) {
      console.error("Error in pollLogs:", error);
      setTrainingStatus("Error updating logs.");
    }
  };

  const submitFinetuningJob = async () => {
    if (!trainableDatasetName) { 
      alert("Please upload and process a dataset first. The 'trainableDatasetName' is missing.");
      return;
    }

    setTrainingStatus("Submitting training job...");
    setLossData([]);
    setLastLogTimestamp(null);
    setCurrentRequestId(null);
    setProgress({ current_step: 0, total_steps: 0, current_epoch: 0, total_epochs: 0 });
    stopPollingLogs();

    const payload = {
      model_name: modelName,
      dataset_path: trainableDatasetName,
      epochs: epochs,
      learning_rate: learningRate,
      lora_rank: loraRank,
    };
    console.log("Starting fine-tuning with payload:", payload);
    try {
      const response = await fetch(`${API_BASE_URL}/finetune/train`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to start training job");
      }

      const data = await response.json();
      setTrainingStatus(`Training job submitted. Request ID: ${data.request_id}. Polling for logs...`);
      setCurrentRequestId(data.request_id);
      setLastLogTimestamp(null);
      setLossData([]);
      setProgress({ current_step: 0, total_steps: 0, current_epoch: 0, total_epochs: 0 });
      setTrainingStatus(`Training in progress... Request ID: ${data.request_id}`);
      setWeightsUrl(null);

      if (selectedProjectId && currentUser) {
        const projectDocRef = doc(db, "users", currentUser.uid, "projects", selectedProjectId);
        try {
          await updateDoc(projectDocRef, {
            requestId: data.request_id,
            baseModel: modelName,
            lastTrainedAt: serverTimestamp(),
            trainingStatusMessage: `Training initiated with ID: ${data.request_id}`,
            weightsUrl: null,
            epochs: parseInt(epochs, 10),
            learningRate: parseFloat(learningRate),
            loraRank: parseInt(loraRank, 10),
            trainableDatasetName: trainableDatasetName,
            lossData: [],
          });
          console.log("Project updated in Firestore with new training job ID:", data.request_id);
        } catch (error) {
          console.error("Error updating project in Firestore with new job ID:", error);
        }
      }

      pollingIntervalRef.current = setInterval(() => {
        setCurrentRequestId(currentId => {
          setLastLogTimestamp(currentTimestamp => {
            if (currentId) {
                 pollLogs(currentId, currentTimestamp);
            }
            return currentTimestamp;
          });
          return currentId;
        });

      }, 5000);

    } catch (error) {
      console.error("Error starting fine-tuning:", error);
      setTrainingStatus(`Error: ${error.message}`);
      stopPollingLogs();
    }
  };
  
  React.useEffect(() => {
    return () => {
      stopPollingLogs();
    };
  }, []);

  // }, []); // Make sure this useEffect for auth is correctly closed if it was open.

  // Conditional rendering for ProjectDashboard vs Project View
  if (!selectedProjectId && !loadingAuth) {
    return (
      <div className="App">
        <Header currentUser={currentUser} auth={auth} />
        <ProjectDashboard 
          currentUser={currentUser} 
          handleProjectSelect={handleProjectSelect} // Changed from onProjectSelect to handleProjectSelect
          onCreateProjectOpen={handleCreateProjectOpen} 
        />
        <CreateProjectDialog 
          open={showCreateProjectDialog} 
          onClose={handleCreateProjectClose} 
          onCreate={handleCreateProject} 
        />
        <Footer />
      </div>
    );
  }

  // Loading state for auth or initial project data
  if (loadingAuth || (selectedProjectId && !selectedProjectData && !currentUser)) {
    return (
      <div className="App">
        <Header currentUser={currentUser} auth={auth} />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading user data and projects...</Typography>
        </Box>
        <Footer />
      </div>
    );
  }

  // If user is not logged in and not loading, show AuthPage (should be handled by onAuthStateChanged redirecting or ProjectDashboard showing login)
  // This might be redundant if ProjectDashboard handles the auth flow adequately.
  if (!currentUser && !loadingAuth) {
    return (
      <div className="App">
        <AuthPage auth={auth} />
        <Footer />
      </div>
    );
  }
  
  // Main project view (when a project is selected)
  return (
    <div className="App">
      <Header currentUser={currentUser} auth={auth} />
      {selectedProjectData && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, backgroundColor: '#f0f0f0', borderBottom: '1px solid #ddd' }}>
          <Typography variant="h6">
            Project: {selectedProjectData.displayName}
            {selectedProjectData.requestId && 
              <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                (Last Training ID: {selectedProjectData.requestId})
              </Typography>
            }
          </Typography>
          <Button variant="outlined" onClick={() => {
            setSelectedProjectId(null); 
            setSelectedProjectData(null);
            setDatasetFile(null);
            setUploadStatus("");
            setTrainableDatasetName(null);
            setModelName("google/gemma-3-1b-pt");
            setEpochs(1);
            setLearningRate(0.0002);
            setLoraRank(4);
            setTrainingStatus("");
            setLossData([]);
            setWeightsUrl(null);
            setCurrentRequestId(null);
            setLastLogTimestamp(null);
            setProgress({ current_step: 0, total_steps: 0, current_epoch: 0, total_epochs: 0 });
          }}>
            Back to Dashboard
          </Button>
        </Box>
      )}

      <div className="main-content">
        <div className="dataset-operations-section"> {/* Changed class from sidebar to dataset-operations-section */}
          <UploadDataset
            onFileChange={handleFileChange}
            onUpload={uploadDataset}
            status={uploadStatus}
            datasetFile={datasetFile}
            disabled={!selectedProjectData} // Disable if no project selected
          />
          {trainableDatasetName && datasetFile && (
            <DatasetPreview file={datasetFile} dataset_path={trainableDatasetName} />
          )}
          {trainableDatasetName && (
            <Paper elevation={1} sx={{ padding: '10px', marginTop: '10px', backgroundColor: '#e8f5e9' }}>
              <Typography variant="body2">Trainable GCS Path: {trainableDatasetName}</Typography>
            </Paper>
          )}
        </div>
        
        <div className="training-section">
          {selectedProjectData ? (
            <>
              <TrainingParameters
                modelName={modelName}
                setModelName={setModelName}
                epochs={epochs}
                setEpochs={setEpochs}
                learningRate={learningRate}
                setLearningRate={setLearningRate}
                loraRank={loraRank}
                setLoraRank={setLoraRank}
                disabled={!!currentRequestId && !weightsUrl} // Disable if training in progress and not complete
              />
              <FinetuneControl
                onStartFinetuning={submitFinetuningJob}
                status={trainingStatus}
                progress={progress}
                weightsUrl={weightsUrl}
                currentRequestId={currentRequestId}
                onStopPolling={stopPollingLogs}
                disabled={!trainableDatasetName || (!!currentRequestId && !weightsUrl)} // Disable if no dataset or training in progress
              />
              <LossGraph lossData={lossData} />
              {weightsUrl && selectedProjectData && (
                <TestLLM weightsUrl={weightsUrl} baseModel={selectedProjectData.baseModel} />
              )}
            </>
          ) : (
            <Typography sx={{m:2}}>Select a project to see training options.</Typography>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default App;
