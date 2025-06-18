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
  const [epochs, setEpochs] = useState(1); // Can be string "" or number
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

  // Add this handler function
  const handleEpochsChange = (value) => {
    if (value === "") {
      setEpochs(""); // Allow epochs state to be an empty string
    } else {
      const num = parseInt(value, 10);
      // If it's a valid number, store it. Otherwise, if user types non-numeric,
      // you might want to keep it as "" or revert to a valid number.
      // For now, only update if it's a parseable number.
      // The min:1 logic is primarily for when the value is *used*.
      if (!isNaN(num)) {
        setEpochs(num < 1 && value !== "0" ? 1 : num); // Store the number, ensure it's at least 1 if not "0"
      } else if (value === "0") {
        setEpochs(0); // Allow typing "0" temporarily
      }
      // If user types "abc", epochs state remains unchanged from its last valid state or ""
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Start of a new user session or app load with an existing user
        setLoadingAuth(true);         // Indicate loading for auth and setup
        setIsUserSetupComplete(false); // Reset user setup status for this session
        setCurrentUser(user);         // Set user object (this will trigger re-render)
        console.log("[AUTH_STATE_CHANGE] User signed in:", user.uid, "Display Name:", user.displayName);

        try {
          console.log("[USER_DOC_LOGIC] Attempting to get/create user document for:", user.uid);
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (!userDocSnap.exists()) {
            console.log("[USER_DOC_LOGIC] User document does not exist for " + user.uid + ". Creating now.");
            await setDoc(userDocRef, {
              email: user.email,
              displayName: user.displayName || user.email, // Store displayName
              createdAt: serverTimestamp(),
            });
            console.log("[USER_DOC_LOGIC] User document created for new user:", user.uid);
          } else {
            console.log("[USER_DOC_LOGIC] User document already exists for:", user.uid, userDocSnap.data());
            // Optionally, update displayName if it changed in Firebase Auth & differs from Firestore
            if (user.displayName && userDocSnap.data().displayName !== user.displayName) {
              await updateDoc(userDocRef, { displayName: user.displayName });
              console.log("[USER_DOC_LOGIC] Updated displayName for user:", user.uid);
            }
          }
          setIsUserSetupComplete(true); // User setup in Firestore is complete
        } catch (e) {
          console.error("[FIRESTORE_CATCH_BLOCK] Error during user document setup:", e);
          setIsUserSetupComplete(false); // Ensure this is false on error
          // Consider signing out user or showing a persistent error message to the user
        } finally {
          setLoadingAuth(false); // Auth and setup process finished for this user session
        }
      } else {
        // User signed out
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
        setLoadingAuth(false); // No longer loading auth state
        setIsUserSetupComplete(false); // No user setup is complete
      }
    });
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount

  const handleGoToDashboard = () => {
    setSelectedProjectId(null);
    setSelectedProjectData(null);
    // Reset other project-specific states to their defaults
    setDatasetFile(null);
    setUploadStatus("");
    setTrainableDatasetName(null);
    // Keep global settings like modelName, epochs, learningRate, loraRank as they are,
    // or reset them if they should be default on the dashboard / new project selection
    setTrainingStatus(""); // Reset training status
    setLossData([]);
    setWeightsUrl(null);
    setCurrentRequestId(null); // Important to clear this
    setLastLogTimestamp(null);
    setProgress({ current_step: 0, total_steps: 0, current_epoch: 0, total_epochs: 0 });
  };

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
      // Reset any previous upload status
      setUploadStatus("");
      
      // Validate file type
      const fileExt = file.name.split('.').pop().toLowerCase();
      if (!['json', 'csv', 'pdf'].includes(fileExt)) {
        alert("Please upload a JSON, CSV, or PDF file.");
        return;
      }
      
      setDatasetFile(file);
    }
  };

  // Upload dataset using the API endpoint
  const uploadDataset = async () => {
    if (!datasetFile) {
      alert("Please select a file.");
      return;
    }
    
    const formData = new FormData();
    formData.append("file", datasetFile);

    try {
      setUploadStatus("Uploading...");
      const response = await fetch(`${API_BASE_URL}/dataset/upload`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error uploading file");
      }
      
      const data = await response.json();
      
      const fileExt = datasetFile.name.split('.').pop().toLowerCase();
      if (fileExt === 'pdf') {
        setUploadStatus("PDF processed successfully: " + data.file_location);
      } else {
        // Assuming data.file_location is the GCS path like "your-bucket-name/your-file.json"
        // We only need "your-file.json" for the training request.
        const fileName = data.file_location.split('/').pop();
        setUploadStatus(`Dataset uploaded: ${fileName}. Ready for training.`);
        // Store the filename for training, or ensure datasetFile.name is correctly set if it's used directly
      }
    } catch (error) {
      console.error("Error uploading file", error);
      setUploadStatus("Error: " + error.message);
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
    // let processedNewPoints = []; // This will be populated specifically with loss data points
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
      const newLossPointsForGraph = []; // Collect only loss data points here

      if (data.loss_values && Array.isArray(data.loss_values)) {
        data.loss_values.forEach(point => { // Iterate with forEach, map is not needed here for its return value
            // Process status and progress messages first
            if (point && point.status_message) {
                latestStatusMessage = point.status_message;
                
                // Update progress if any relevant fields are present
                const hasProgressInfo = point.current_step !== undefined ||
                                        point.total_steps !== undefined ||
                                        point.current_epoch !== undefined ||
                                        point.total_epochs !== undefined;

                if (hasProgressInfo) {
                    setProgress(prevProgress => {
                        const newProg = { ...prevProgress }; // Create a mutable copy

                        if (point.current_step !== undefined) {
                            newProg.current_step = point.current_step;
                        }
                        if (point.total_steps !== undefined) {
                            newProg.total_steps = point.total_steps;
                        }
                        if (point.current_epoch !== undefined) {
                            newProg.current_epoch = point.epoch; // Ensure this matches the backend field name, e.g., 'epoch' or 'current_epoch'
                        }
                        if (point.total_epochs !== undefined) {
                            newProg.total_epochs = point.total_epochs;
                        }
                        return newProg;
                    });
                }
            }

            // Check for training completion
            if (point && point.status === 'complete') {
                trainingCompleted = true;
                // Update status message if completion log has one, otherwise use a default
                latestStatusMessage = point.status_message || "Training complete! Processing final results...";
                if (point.weights_url) {
                    newWeightsUrl = point.weights_url;
                }
            }

            // Check for loss data specifically for the graph
            if (point && typeof point.loss === 'number' && point.current_epoch !== undefined) { // Ensure current_epoch is present for loss points
              newLossPointsForGraph.push({
                current_epoch: point.current_epoch, // or point.epoch if that's the field name
                time: new Date(point.timestamp).toLocaleTimeString(),
                loss: point.loss,
                rawTimestamp: point.timestamp
              });
            }
            
            // Log other general messages if they exist and are not loss/status specific
            // This helps in debugging what kind of messages are coming through
            if (point && point.message && typeof point.loss === 'undefined' && !point.status_message && point.status !== 'complete') {
                console.log("General log message:", point.message, point);
            }
        });

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
        // If no explicit latest_timestamp, try to get from the last loss point
        setLastLogTimestamp(newLossPointsForGraph[newLossPointsForGraph.length - 1].rawTimestamp);
      } else if (data.loss_values && data.loss_values.length > 0) {
        // Fallback: if no loss points but other messages came, use the timestamp of the last message
        const lastLogEntry = data.loss_values[data.loss_values.length - 1];
        if (lastLogEntry && lastLogEntry.timestamp) {
            setLastLogTimestamp(lastLogEntry.timestamp);
        }
      }
      
      if (trainingCompleted) {
        stopPollingLogs();
        if (newWeightsUrl) {
          setWeightsUrl(newWeightsUrl);
          // The status message for completion is already set in the loop
        }
        // setTrainingStatus is already called with latestStatusMessage which would be the completion message
      }

    } catch (error) {
      console.error("Error in pollLogs:", error);
      setTrainingStatus("Error updating logs.");
    }
  };


  // Start fine-tuning via HTTP
  const startFinetuning = async () => {
    if (!datasetFile && !uploadStatus.startsWith("Dataset uploaded")) {
        alert("Please upload a dataset first.");
        return;
    }

    // Extract the filename from uploadStatus if available, otherwise use datasetFile.name
    let datasetPathForTraining;
    if (uploadStatus.startsWith("Dataset uploaded: ")) {
        datasetPathForTraining = uploadStatus.replace("Dataset uploaded: ", "").replace(". Ready for training.", "");
    } else if (datasetFile) {
        datasetPathForTraining = datasetFile.name;
    } else {
        alert("Dataset not specified correctly.");
        return;
    }


    setTrainingStatus("Submitting training job...");
    setLossData([]); // Clear previous loss data
    setLastLogTimestamp(null); // Reset last log timestamp
    setCurrentRequestId(null); // Reset request ID
    setProgress({ current_step: 0, total_steps: 0, current_epoch: 0, total_epochs: 0 }); // Reset progress
    stopPollingLogs(); // Clear any existing polling interval

    const payload = {
      model_name: modelName,
      dataset_path: datasetPathForTraining, // Use the extracted/stored filename
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
      setLastLogTimestamp(new Date().toISOString()); // Start polling from now

      // Start polling
      pollingIntervalRef.current = setInterval(() => {
        // Pass currentRequestId and lastLogTimestamp to pollLogs
        // Need to use a function form of setState or refs if pollLogs itself is not recreated with these values
        // For simplicity, pollLogs will fetch these from state directly if they are updated correctly.
        // However, setInterval captures the initial state. A better way is to pass them or use a ref.
        
        // Correct way to ensure pollLogs gets the latest state:
        // Wrap the pollLogs call in a function that reads the latest state
        // Or, ensure pollLogs is part of the component and has access to up-to-date state
        // For now, we'll rely on pollLogs accessing the state, but this can be tricky with setInterval.
        // A common pattern is to use a ref for the values or clear and set a new interval.
        
        // Let's pass them directly to ensure correctness
        // Need to get the latest values, not the ones captured at setInterval creation.
        // This is a common pitfall. We'll use a functional update or ref for `lastLogTimestamp` inside `pollLogs`
        // or ensure `pollLogs` is redefined if `lastLogTimestamp` changes.
        // For now, let's assume `pollLogs` correctly fetches `currentRequestId` and `lastLogTimestamp` from state.
        // This will be handled by `lastLogTimestamp` being updated by `pollLogs` itself.
        
        // A simple way to ensure pollLogs uses the latest state values:
        setCurrentRequestId(currentId => {
          setLastLogTimestamp(currentTimestamp => {
            if (currentId) { // Only poll if we have a request ID
                 pollLogs(currentId, currentTimestamp);
            }
            return currentTimestamp; // No change to timestamp here, pollLogs updates it
          });
          return currentId; // No change to ID here
        });

      }, 5000); // Poll every 5 seconds

    } catch (error) {
      console.error("Error starting fine-tuning:", error);
      setTrainingStatus(`Error: ${error.message}`);
      stopPollingLogs();
    }
  };
  
  // Effect to clean up polling on component unmount
  React.useEffect(() => {
    return () => {
      stopPollingLogs();
    };
  }, []);


  const downloadWeights = async () => {
    if (!currentRequestId) {
      setTrainingStatus("Error: No request ID found for download.");
      console.error("Download weights called without a currentRequestId.");
      return;
    }
    setTrainingStatus("Preparing download ZIP for model artifacts...");
    try {
      // Call backend to get ZIP of all model files for this model
      const response = await fetch(`${API_BASE_URL}/download_weights_zip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: currentRequestId })
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Failed to get ZIP download");
      }
      // Download the zip file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `model_${currentRequestId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setTrainingStatus("Model ZIP download started.");
    } catch (error) {
      console.error("Error downloading weights as ZIP:", error);
      setTrainingStatus(`Error downloading weights: ${error.message}`);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header 
        currentUser={currentUser} 
        auth={auth} 
        selectedProjectId={selectedProjectId} 
        onGoToDashboard={handleGoToDashboard} 
      />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}>
        {loadingAuth ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading authentication...</Typography>
          </Box>
        ) : !currentUser ? (
          <AuthPage />
        ) : !isUserSetupComplete ? ( 
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Finalizing user setup...</Typography>
          </Box>
        ) : !selectedProjectId ? ( 
          <>
            <ProjectDashboard
              currentUser={currentUser}
              handleCreateProjectOpen={handleCreateProjectOpen}
              handleProjectSelect={handleProjectSelect}
            />
            <CreateProjectDialog
              open={showCreateProjectDialog}
              onClose={handleCreateProjectClose}
              onCreate={handleCreateProject}
            />
          </>
        ) : selectedProjectId ? (
          <div className="container" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="main-content" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              {selectedProjectData && (
                <Typography variant="h5" gutterBottom sx={{ textAlign: 'center', margin: 2 }}>
                  Project: {selectedProjectData.displayName} (ID: {selectedProjectId})
                </Typography>
              )}
              <UploadDataset
                datasetFile={datasetFile}
                onFileChange={handleFileChange}
                uploadStatus={uploadStatus}
                status={uploadStatus} // Pass status for consistency if UploadDataset uses it
                onUpload={uploadDataset}
              />
              <DatasetPreview 
                datasetFile={datasetFile}
                dataset_path={trainableDatasetName || (datasetFile ? (uploadStatus.startsWith("Dataset uploaded: ") ? uploadStatus.replace("Dataset uploaded: ", "").replace(". Ready for training.", "") : datasetFile.name) : null)}
              />
              <TrainingParameters
                modelName={modelName}
                epochs={epochs}
                learningRate={learningRate}
                loraRank={loraRank}
                onModelNameChange={setModelName}
                onEpochsChange={handleEpochsChange} // Use the new handler
                onLearningRateChange={setLearningRate}
                onLoraRankChange={setLoraRank}
              />
              <FinetuneControl 
                  onStart={startFinetuning} 
                  wsStatus={trainingStatus} // Ensure this prop is named consistently if FinetuneControl expects 'status' or 'trainingStatus'
                  progress={progress}
              /> 
              <LossGraph lossData={lossData} />
              
              {weightsUrl && (
                <Paper elevation={3} sx={{ padding: 3, marginTop: 2, marginBottom: 2, backgroundColor: "#f9f9f9" }}>
                  <Typography variant="h5" gutterBottom className="sessionName">
                    Download Fine-Tuned Model
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={downloadWeights}
                    startIcon={<GetAppIcon />}
                    sx={{ 
                      backgroundColor: "#6200ee", 
                      "&:hover": { backgroundColor: "#3700b3" } 
                    }}
                  >
                    Download All Model Files (ZIP)
                  </Button>
                </Paper>
              )}
              <TestLLM currentRequestId={currentRequestId} currentBaseModel={modelName} />
            </div>
          </div>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
            <Typography>An unexpected error occurred. Please refresh the page.</Typography>
          </Box>
        )}
      </Box>
      <Footer/>
    </Box>
  );
}

export default App;
