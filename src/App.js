import React, { useState, useRef } from "react";
import Header from "./components/Header";
import UploadDataset from "./components/UploadDataset";
import TrainingParameters from "./components/TrainingParameters";
import FinetuneControl from "./components/FinetuneControl";
import LossGraph from "./components/LossGraph";
import Sidebar from "./components/Sidebar";
import TestLLM from "./components/TestLLM";
import DatasetPreview from "./components/DatasetPreview";
import Footer from "./components/Footer";
import AuthPage from "./components/AuthPage"; // Import AuthPage
import ProjectDashboard from "./components/ProjectDashboard"; // ADDED
import CreateProjectDialog from "./components/CreateProjectDialog"; // ADDED
import { auth, db } from "./firebase"; // Import Firebase auth and db
import { onAuthStateChanged } from "firebase/auth"; // Import onAuthStateChanged
// ADDED Firestore functions
import { doc, setDoc, getDoc, serverTimestamp, collection, addDoc, updateDoc } from "firebase/firestore"; 
import "./style/App.css";

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

import { Paper, Typography, Button, Box, CircularProgress } from "@mui/material";
import GetAppIcon from "@mui/icons-material/GetApp";

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
  const [progress, setProgress] = useState({ current_step: 0, total_steps: 0, current_epoch: 0, total_epochs: 0 }); // New state for progress
  const [currentUser, setCurrentUser] = useState(null); // State for current user
  const [loadingAuth, setLoadingAuth] = useState(true); // State for auth loading
  // ADDED state for project management
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedProjectData, setSelectedProjectData] = useState(null);
  const [trainableDatasetName, setTrainableDatasetName] = useState(null); // Ensure this line is present


  // Listen to Firebase auth state changes
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => { // Made async
      if (user) {
        setCurrentUser(user);
        console.log("[AUTH_STATE_CHANGE] User signed in:", user.uid);
        console.log("[AUTH_STATE_CHANGE] Firestore 'db' instance:", db); // Log the db instance

        try {
          // --- Test Firestore Read ---
          console.log("[FIRESTORE_TEST] Attempting test read from 'test_collection/test_doc'");
          const testDocRef = doc(db, "test_collection", "test_doc_user_" + user.uid); // Make it user-specific to avoid collisions if multiple users test
          const testDocSnap = await getDoc(testDocRef);
          if (testDocSnap.exists()) {
            console.log("[FIRESTORE_TEST] Test read successful. Document data:", testDocSnap.data());
          } else {
            console.log("[FIRESTORE_TEST] Test read successful. Document 'test_collection/test_doc_user_" + user.uid + "' does not exist (this is OK for the test).");
            // Optionally, try to write to it to test write permissions
            // await setDoc(testDocRef, { testField: "hello world from " + user.uid, user: user.email, timestamp: serverTimestamp() });
            // console.log("[FIRESTORE_TEST] Test write successful to 'test_collection/test_doc_user_" + user.uid + "'. Check Firestore console.");
          }
          // --- End Test Firestore Read ---

          // Check/create user document in Firestore (Original Logic)
          console.log("[USER_DOC_LOGIC] Attempting to get/create user document for:", user.uid);
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (!userDocSnap.exists()) {
            console.log("[USER_DOC_LOGIC] User document does not exist for " + user.uid + ". Creating now.");
            await setDoc(userDocRef, {
              email: user.email,
              createdAt: serverTimestamp(),
              // Add any other initial user data here
            });
            console.log("[USER_DOC_LOGIC] User document created in Firestore for new user:", user.uid);
          } else {
            console.log("[USER_DOC_LOGIC] User document already exists for:", user.uid, userDocSnap.data());
          }
        } catch (error) {
          console.error("[FIRESTORE_ERROR] Error during Firestore operation in onAuthStateChanged:", error.message);
          console.error("[FIRESTORE_ERROR] Full error object:", error); // Log the full error object
          // Specifically log error code and name if available, as they can be informative
          if (error.code) console.error("[FIRESTORE_ERROR] Error Code:", error.code);
          if (error.name) console.error("[FIRESTORE_ERROR] Error Name:", error.name);
        }

      } else {
        // User is signed out
        console.log("[AUTH_STATE_CHANGE] User signed out.");
        setCurrentUser(null);
        setSelectedProjectId(null); // Clear project selection on logout
        setSelectedProjectData(null);
        // Also reset other app states if necessary
        setDatasetFile(null);
        setUploadStatus("");
        setTrainableDatasetName(null); // ADDED: Reset trainable dataset name
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
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  // ADDED: Handlers for Create Project Dialog
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
      await addDoc(projectsCollectionRef, {
        displayName: projectName,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        requestId: null,
        baseModel: modelName, // Uses current global modelName or could be a default from settings
        weightsUrl: null,
        lastTrainedAt: null,
        // You could also store initial training parameters here if desired
        // epochs: epochs,
        // learningRate: learningRate,
        // loraRank: loraRank,
      });
      console.log("Project created successfully:", projectName);
      handleCreateProjectClose(); // Close dialog after creation
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project: " + error.message);
    }
  };
  
  // ADDED: Handler for selecting a project
  const handleProjectSelect = async (projectId) => {
    if (!currentUser || !projectId) {
      setSelectedProjectId(null);
      setSelectedProjectData(null);
      setTrainableDatasetName(null); // ADDED: Reset trainable dataset name
      return;
    }
    
    setLoadingAuth(true); // Use main auth loading state for simplicity, or add a new one
    const projectDocRef = doc(db, "users", currentUser.uid, "projects", projectId);
    const projectDocSnap = await getDoc(projectDocRef);

    if (projectDocSnap.exists()) {
      const projectData = { id: projectDocSnap.id, ...projectDocSnap.data() };
      setSelectedProjectData(projectData);
      setSelectedProjectId(projectId);

      // Reset general app states to default or project-specific values
      setDatasetFile(null); // Assuming dataset is not stored with project, or needs re-upload per session
      setUploadStatus("");
      setTrainableDatasetName(null); // ADDED: Reset trainable dataset name for new project context
      
      // Load parameters from project if they exist, otherwise use current or default
      setEpochs(projectData.epochs || epochs); 
      setLearningRate(projectData.learningRate || learningRate);
      setLoraRank(projectData.loraRank || loraRank);
      
      setTrainingStatus(projectData.requestId ? "Project data loaded." : "Ready for training.");
      setLossData(projectData.lossData || []); // Load saved loss data if available
      setWeightsUrl(projectData.weightsUrl || null);
      setCurrentRequestId(projectData.requestId || null);
      setLastLogTimestamp(null); // Always reset for polling if needed for a new/resumed job
      setProgress({ current_step: 0, total_steps: 0, current_epoch: 0, total_epochs: 0 }); // Reset progress
      setModelName(projectData.baseModel || modelName); // Load project's base model

      if (projectData.requestId && projectData.weightsUrl) {
        setTrainingStatus(`Training completed for project '${projectData.displayName}'. Model is available.`);
      } else if (projectData.requestId) {
        setTrainingStatus(`Training for project '${projectData.displayName}' was previously initiated (ID: ${projectData.requestId}). Check status or start new training.`);
        // Optionally, trigger polling here if the job might be active and you want to auto-resume monitoring
        // pollLogs(projectData.requestId, projectData.lastLogTimestamp || null); 
      }

    } else {
      console.error("Selected project not found in Firestore:", projectId);
      alert("Error: Could not load project data. The project may have been deleted.");
      setSelectedProjectData(null);
      setSelectedProjectId(null); // Clear selection if project not found
    }
    setLoadingAuth(false);
  };


  // Handle file changes
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Reset any previous upload status
      setUploadStatus("");
      setTrainableDatasetName(null); // ADDED: Reset trainable name when new file is selected
      
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
      setTrainableDatasetName(null); // Reset before new upload attempt
      const response = await fetch(`${API_BASE_URL}/dataset/upload`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error uploading file");
      }
      
      const data = await response.json(); // from /dataset/upload
      const fileExt = datasetFile.name.split('.').pop().toLowerCase();
      let readyFileName;

      // Regardless of PDF or other, the backend now returns file_location of the ready-to-use file.
      readyFileName = data.file_location.split('/').pop();
      
      if (fileExt === 'pdf') {
        setUploadStatus(`PDF processed. Trainable dataset: ${readyFileName}`);
      } else {
        setUploadStatus(`Dataset uploaded: ${readyFileName}. Ready for training.`);
      }
      setTrainableDatasetName(readyFileName); // Set the trainable name
    } catch (error) {
      console.error("Error uploading file", error);
      setUploadStatus("Error: " + error.message);
      setTrainableDatasetName(null); // Reset on error
    }
  };

  // Stop polling for logs
  const stopPollingLogs = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log("Stopped polling for logs.");
    }
  };

  // Fetch logs periodically
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
        // CHANGED to for...of loop to allow await inside for Firestore updates
        for (const point of data.loss_values) { 
            // Process status and progress messages first
            if (point && point.status_message) {
                latestStatusMessage = point.status_message;
                
                // Update progress if any relevant fields are present
                const hasProgressInfo = point.current_step !== undefined ||
                                        point.total_steps !== undefined ||
                                        point.current_epoch !== undefined || // Corrected: was point.epoch
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
                        if (point.current_epoch !== undefined) { // Check current_epoch from point
                            newProg.current_epoch = point.current_epoch; // Use point.current_epoch
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
                latestStatusMessage = point.status_message || "Training complete. Model saved.";
                newWeightsUrl = point.weights_url || null; 
                console.log("Training complete, weights URL:", newWeightsUrl);
                
                // ADDED: Update Firestore project document
                if (selectedProjectId && currentUser && currentRequestId === requestId) { 
                  const projectDocRef = doc(db, "users", currentUser.uid, "projects", selectedProjectId);
                  try {
                    // CHANGED to updateDoc for partial update
                    await updateDoc(projectDocRef, { 
                      // requestId: currentRequestId, // requestId is already set when job starts
                      // baseModel: modelName, // baseModel is set on creation or can be updated if it changes per run
                      weightsUrl: newWeightsUrl, 
                      lastTrainedAt: serverTimestamp(),
                      trainingStatusMessage: latestStatusMessage, // Store final status
                      // Optionally save final loss data or other metrics here
                      // epochs: epochs, // Save parameters used for this run
                      // learningRate: learningRate,
                      // loraRank: loraRank,
                    });
                    console.log("Project updated in Firestore with training completion details:", selectedProjectId);
                  } catch (error) {
                    console.error("Error updating project in Firestore after training completion:", error);
                  }
                }
            }
            
            // Process loss data for the graph
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
        } // Corrected closing brace for the for...of loop body
        
        // The following code is now correctly placed *after* the for...of loop
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


  // Start finetuning using the API endpoint
  const submitFinetuningJob = async () => {
    if (!trainableDatasetName) { // MODIFIED: Check trainableDatasetName state
      alert("Please upload and process a dataset first. The 'trainableDatasetName' is missing.");
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
      dataset_path: trainableDatasetName, // MODIFIED: Use trainableDatasetName state
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
      setLastLogTimestamp(null); // Reset last log timestamp for the new job
      setLossData([]); // Clear previous loss data
      setProgress({ current_step: 0, total_steps: 0, current_epoch: 0, total_epochs: 0 }); // Reset progress
      setTrainingStatus(`Training in progress... Request ID: ${data.request_id}`);
      setWeightsUrl(null); // Clear any previous weights URL

      // Update Firestore with the new requestId for the current project
      if (selectedProjectId && currentUser) {
        const projectDocRef = doc(db, "users", currentUser.uid, "projects", selectedProjectId);
        try {
          await updateDoc(projectDocRef, {
            requestId: data.request_id,
            baseModel: modelName, // Ensure the current baseModel is saved for this run
            lastTrainedAt: serverTimestamp(), // Timestamp for job submission
            trainingStatusMessage: `Training initiated with ID: ${data.request_id}`,
            weightsUrl: null, // Clear any old weights URL
            // Optionally, save the training parameters for this run
            epochs: parseInt(epochs, 10),
            learningRate: parseFloat(learningRate),
            loraRank: parseInt(loraRank, 10),
          });
          console.log("Project updated in Firestore with new training job ID:", data.request_id);
        } catch (error) {
          console.error("Error updating project in Firestore with new job ID:", error);
        }
      }

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

  // Conditional Rendering Logic
  if (loadingAuth) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading authentication...</Typography>
      </Box>
    );
  }

  if (!currentUser) {
    return <AuthPage />;
  }

  // If no project is selected, show the dashboard
  if (!selectedProjectId) {
    return (
      <>
        <Header currentUser={currentUser} auth={auth} /> 
        <ProjectDashboard 
          handleCreateProjectOpen={handleCreateProjectOpen} 
          handleProjectSelect={handleProjectSelect} 
          currentUser={currentUser} // Pass currentUser to ProjectDashboard
        />
        <CreateProjectDialog 
          open={showCreateProjectDialog} 
          handleClose={handleCreateProjectClose} 
          handleCreateProject={handleCreateProject}
        />
        <Footer />
      </>
    );
  }

  // Main application view (Project Detail View)
  return (
    <div className="App">
      <Header currentUser={currentUser} auth={auth} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, backgroundColor: '#f0f0f0', borderBottom: '1px solid #ddd' }}>
        <Typography variant="h6">
          Project: {selectedProjectData ? selectedProjectData.displayName : 'Loading...'}
          {selectedProjectData && selectedProjectData.requestId && 
            <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
              (Last Training ID: {selectedProjectData.requestId})
            </Typography>
          }
        </Typography>
        <Button variant="outlined" onClick={() => {
          setSelectedProjectId(null); 
          setSelectedProjectData(null);
          // Reset states to default when going back to dashboard
          setDatasetFile(null);
          setUploadStatus("");
          setTrainableDatasetName(null); // ADDED: Reset trainable dataset name
          setModelName("google/gemma-3-1b-pt"); // Reset model name
          setEpochs(1); // Reset epochs
          setLearningRate(0.0002); // Reset learning rate
          setLoraRank(4); // Reset lora rank
          setTrainingStatus(""); // Reset training status
          setLossData([]); // Clear loss data
          setWeightsUrl(null); // Clear weights URL
          setCurrentRequestId(null); // Clear current request ID
          setLastLogTimestamp(null); // Clear last log timestamp
          setProgress({ current_step: 0, total_steps: 0, current_epoch: 0, total_epochs: 0 }); // Reset progress
        }}>
          Back to Dashboard
        </Button>
      </Box>
      <div className="main-content">
        <Sidebar>
          <UploadDataset
            onFileChange={handleFileChange}
            onUpload={uploadDataset}
            status={uploadStatus}
            datasetFile={datasetFile}
          />
          {datasetFile && <DatasetPreview file={datasetFile} />}
        </Sidebar>
        <div className="training-section">
          <TrainingParameters
            modelName={modelName}
            setModelName={setModelName}
            epochs={epochs}
            setEpochs={setEpochs}
            learningRate={learningRate}
            setLearningRate={setLearningRate}
            loraRank={loraRank}
            setLoraRank={setLoraRank}
            disabled={!!currentRequestId && trainingStatus.includes("in progress")} // Disable if training active
          />
          <FinetuneControl
            onFinetune={submitFinetuningJob}
            status={trainingStatus}
            weightsUrl={weightsUrl}
            currentRequestId={currentRequestId}
            disabled={!trainableDatasetName || (!!currentRequestId && trainingStatus.includes("in progress"))} // MODIFIED: Check trainableDatasetName
          />
          {lossData.length > 0 && (
            <Paper elevation={2} sx={{ padding: 2, marginTop: 2 }}>
              <Typography variant="h6" gutterBottom>
                Training Loss
              </Typography>
              <LossGraph data={lossData} />
            </Paper>
          )}
          {weightsUrl && (
            <Paper
              elevation={2}
              sx={{
                padding: 2,
                marginTop: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Typography variant="h6" gutterBottom>
                Model Weights Ready
              </Typography>
              <Button
                variant="contained"
                color="success"
                href={weightsUrl}
                download="model_weights.zip" // Suggest a filename for download
                target="_blank" // Open in new tab, though download attribute might override
                rel="noopener noreferrer"
                startIcon={<GetAppIcon />}
                sx={{ marginTop: 1 }}
              >
                Download Weights
              </Button>
            </Paper>
          )}
        </div>
        <div className="test-llm-section">
          <TestLLM 
            currentModelName={currentRequestId || "default_model_name_if_no_request_id"} // Pass request ID or a default
            currentBaseModel={modelName} // Pass the base model name
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default App;
