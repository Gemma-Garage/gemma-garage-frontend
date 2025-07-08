import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Button } from '@mui/material';
import GetAppIcon from "@mui/icons-material/GetApp";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { API_BASE_URL } from "../api";

// Import components
import UploadDataset from '../components/UploadDataset';
import TrainingParameters from '../components/TrainingParameters';
import FinetuneControl from '../components/FinetuneControl';
import LossGraph from '../components/LossGraph';
import TestLLM from '../components/TestLLM';
import DatasetPreview from '../components/DatasetPreview';
import PretrainStepProgress from '../components/PretrainStepProgress';
import { extractPretrainLogs, hasTrainingStarted } from "../utils/pretrainLogUtils";

function ProjectPage({ currentUser }) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  // All the state variables from the original App.js
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
  const [progress, setProgress] = useState({ current_step: 0, total_steps: 0, current_epoch: 0, total_epochs: 0 });
  const [selectedProjectData, setSelectedProjectData] = useState(null);
  const [trainableDatasetName, setTrainableDatasetName] = useState(null);
  const [selectedDatasetChoice, setSelectedDatasetChoice] = useState("original");
  const [augmentedDatasetFileName, setAugmentedDatasetFileName] = useState(null);
  const [allLogs, setAllLogs] = useState([]);

  const pollingIntervalRef = useRef(null);
  const requestIdRef = useRef(null);
  const lastLogTimestampRef = useRef(null);

  // Load project data on mount
  useEffect(() => {
    const loadProject = async () => {
      if (!currentUser || !projectId) return;
      
      try {
        const projectDocRef = doc(db, "users", currentUser.uid, "projects", projectId);
        const projectDocSnap = await getDoc(projectDocRef);

        if (projectDocSnap.exists()) {
          const projectData = { id: projectDocSnap.id, ...projectDocSnap.data() };
          setSelectedProjectData(projectData);

          // Load project settings
          setTrainableDatasetName(projectData.trainableDatasetName || null);
          setEpochs(projectData.epochs || 1);
          setLearningRate(projectData.learningRate || 0.0002);
          setLoraRank(projectData.loraRank || 4);
          setTrainingStatus(projectData.trainingStatusMessage || "Ready for training.");
          setLossData(projectData.lossData || []);
          setWeightsUrl(projectData.weightsUrl || null);
          setCurrentRequestId(projectData.requestId || null);
          setModelName(projectData.baseModel || "google/gemma-3-1b-pt");

          if (projectData.requestId) {
            requestIdRef.current = projectData.requestId;
          }
        } else {
          console.error("Project not found");
          navigate('/home');
        }
      } catch (error) {
        console.error("Error loading project:", error);
        navigate('/home');
      }
    };

    loadProject();
  }, [currentUser, projectId, navigate]);

  // All the handler functions from App.js
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Reset any previous upload status
      setUploadStatus("");
      
      // Validate file type
      const fileExt = file.name.split('.').pop().toLowerCase();
      if (!['json', 'csv', 'pdf', 'ppt', 'pptx', 'docx', 'html', 'txt'].includes(fileExt)) {
        alert("Please upload a JSON, CSV, PDF, PPT, PPTX, DOCX, HTML, or TXT file.");
        return;
      }
      
      setDatasetFile(file);
    }
  };

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
      console.log('[App pollLogs] Received data:', data);
      let latestStatusMessage = trainingStatus; 
      let trainingCompleted = false;
      let newWeightsUrl = weightsUrl;
      const newLossPointsForGraph = [];

      // --- Pretrain log debug ---
      if (data.loss_values && Array.isArray(data.loss_values)) {
        const pretrainLogs = extractPretrainLogs(data.loss_values);
        console.log('[PretrainStepProgress] Raw logs received:', data.loss_values);
        console.log('[PretrainStepProgress] Extracted pretrain logs:', pretrainLogs);
        console.log('[PretrainStepProgress] Pretrain logs count:', pretrainLogs.length);
        
        // Debug step field analysis
        data.loss_values.forEach((log, idx) => {
          if (log.step !== undefined || log.step_name !== undefined) {
            console.log(`[PretrainStepProgress] Log ${idx}: step=${log.step}, step_name="${log.step_name}", status_message="${log.status_message}"`);
          }
        });
        
        if (pretrainLogs.length > 0) {
          console.log('[PretrainStepProgress] Pretrain logs:', pretrainLogs);
        }
      }
      // --- End pretrain log debug ---

      if (data.loss_values && Array.isArray(data.loss_values)) {
        console.log('[App pollLogs] About to update allLogs with:', data.loss_values.length, 'logs');
        // Append all logs to allLogs state
        setAllLogs(prevLogs => {
          console.log('[App pollLogs] Current allLogs length:', prevLogs.length);
          // Avoid duplicates by timestamp
          const existingTimestamps = new Set(prevLogs.map(l => l.timestamp));
          const newLogs = data.loss_values.filter(l => l.timestamp && !existingTimestamps.has(l.timestamp));
          console.log('[App pollLogs] New logs to add:', newLogs.length);
          if (newLogs.length > 0) {
            console.log('[App pollLogs] Adding new logs to allLogs:', newLogs);
          }
          return [...prevLogs, ...newLogs];
        });
        
        data.loss_values.forEach(point => {
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
                        const newProg = { ...prevProgress };

                        if (point.current_step !== undefined) {
                            newProg.current_step = point.current_step;
                        }
                        if (point.total_steps !== undefined) {
                            newProg.total_steps = point.total_steps;
                        }
                        if (point.current_epoch !== undefined) {
                            newProg.current_epoch = point.current_epoch; // Ensure this matches the backend field name, e.g., 'epoch' or 'current_epoch'
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
                latestStatusMessage = point.status_message || "Training complete! Processing final results...";
                if (point.weights_url) {
                    newWeightsUrl = point.weights_url;
                }
            }

            // Check for loss data specifically for the graph
            if (point && typeof point.loss === 'number' && point.current_epoch !== undefined) {
              newLossPointsForGraph.push({
                current_epoch: point.current_epoch,
                time: new Date(point.timestamp).toLocaleTimeString(),
                loss: point.loss,
                rawTimestamp: point.timestamp
              });
            }
            
            // Log other general messages if they exist and are not loss/status specific
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
        lastLogTimestampRef.current = data.latest_timestamp;
      } else if (newLossPointsForGraph.length > 0 && newLossPointsForGraph[newLossPointsForGraph.length - 1].rawTimestamp) {
        const newTimestamp = newLossPointsForGraph[newLossPointsForGraph.length - 1].rawTimestamp;
        setLastLogTimestamp(newTimestamp);
        lastLogTimestampRef.current = newTimestamp;
      } else if (data.loss_values && data.loss_values.length > 0) {
        const lastLogEntry = data.loss_values[data.loss_values.length - 1];
        if (lastLogEntry && lastLogEntry.timestamp) {
            setLastLogTimestamp(lastLogEntry.timestamp);
            lastLogTimestampRef.current = lastLogEntry.timestamp;
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

  const startFinetuning = async () => {
    if (!datasetFile && !uploadStatus.startsWith("Dataset uploaded")) {
        alert("Please upload a dataset first.");
        return;
    }

    // Extract the filename from uploadStatus if available, otherwise use datasetFile.name
    let datasetPathForTraining;
    if (selectedDatasetChoice === "augmented" && augmentedDatasetFileName) {
        datasetPathForTraining = augmentedDatasetFileName;
    } else if (uploadStatus.startsWith("Dataset uploaded: ")) {
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
    lastLogTimestampRef.current = null;
    setCurrentRequestId(null); // Reset request ID
    requestIdRef.current = null;
    setProgress({ current_step: 0, total_steps: 0, current_epoch: 0, total_epochs: 0 }); // Reset progress
    stopPollingLogs(); // Clear any existing polling interval
    setAllLogs([]); // Reset all logs for new job

    const payload = {
      model_name: modelName,
      dataset_path: datasetPathForTraining, // Use the extracted/stored filename
      epochs: epochs,
      learning_rate: learningRate,
      lora_rank: loraRank,
      dataset_choice: selectedDatasetChoice, // Pass the dataset choice (original/augmented)
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
      
      // Set state and refs
      setCurrentRequestId(data.request_id);
      requestIdRef.current = data.request_id;
      // Start with null timestamp to fetch all logs from the beginning
      setLastLogTimestamp(null);
      lastLogTimestampRef.current = null;

      // Start polling
      pollingIntervalRef.current = setInterval(() => {
        if (requestIdRef.current) {
          pollLogs(requestIdRef.current, lastLogTimestampRef.current);
        }
      }, 5000); // Poll every 5 seconds

    } catch (error) {
      console.error("Error starting fine-tuning:", error);
      setTrainingStatus(`Error: ${error.message}`);
      stopPollingLogs();
    }
  };

  const downloadWeights = async () => {
    if (!currentRequestId) {
      setTrainingStatus("Error: No request ID found for download.");
      console.error("Download weights called without a currentRequestId.");
      return;
    }
    setTrainingStatus("Preparing download ZIP for model artifacts...");
    try {
      console.log("[Download] Calling backend /download_weights_zip with request_id:", currentRequestId);
      const response = await fetch(`${API_BASE_URL}/download/download_weights_zip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: currentRequestId })
      });
      console.log("[Download] Backend response status:", response.status);
      if (!response.ok) {
        const errorData = await response.text();
        console.error("[Download] Backend error:", errorData);
        throw new Error(errorData || "Failed to get ZIP download");
      }
      const blob = await response.blob();
      console.log("[Download] Received ZIP blob, size:", blob.size);
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

  // Effect to clean up polling on component unmount
  React.useEffect(() => {
    return () => {
      stopPollingLogs();
    };
  }, []);

  const handleEpochsChange = (value) => {
    if (value === "") {
      setEpochs("");
    } else {
      const num = parseInt(value, 10);
      if (!isNaN(num)) {
        setEpochs(num < 1 && value !== "0" ? 1 : num);
      } else if (value === "0") {
        setEpochs(0);
      }
    }
  };

  // ... other handlers would be copied from App.js

  if (!selectedProjectData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Typography>Loading project...</Typography>
      </Box>
    );
  }

  return (
    <div className="container" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="main-content" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h5" gutterBottom sx={{ textAlign: 'center', margin: 2 }}>
          Project: {selectedProjectData.displayName} (ID: {projectId})
        </Typography>
        
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
          onDatasetChoiceChange={setSelectedDatasetChoice}
          selectedDatasetChoice={selectedDatasetChoice}
          onAugmentedDatasetReady={setAugmentedDatasetFileName}
        />
        
        <TrainingParameters
          modelName={modelName}
          epochs={epochs}
          learningRate={learningRate}
          loraRank={loraRank}
          onModelNameChange={setModelName}
          onEpochsChange={handleEpochsChange}
          onLearningRateChange={setLearningRate}
          onLoraRankChange={setLoraRank}
        />
        
        {/* Pre-training step progress bar: only show if not yet started training and there are pretrain logs */}
        {(() => {
          // Debug print for logs and extracted pretrain logs
          // eslint-disable-next-line no-console
          console.log('[App render] allLogs:', allLogs);
          // eslint-disable-next-line no-console
          console.log('[App render] extractPretrainLogs(allLogs):', extractPretrainLogs(allLogs));
          // Show pretraining progress bar if there are pretrain logs and training hasn't started yet
          return extractPretrainLogs(allLogs).length > 0 && !hasTrainingStarted(allLogs) && (
            <PretrainStepProgress logs={extractPretrainLogs(allLogs)} />
          );
        })()}
        
        <FinetuneControl 
          onStart={startFinetuning}
          wsStatus={trainingStatus}
          progress={progress}
          allLogs={allLogs}
        />
        
        <LossGraph lossData={lossData} />
        
        {/* Download button */}
        {currentRequestId && trainingStatus.toLowerCase().includes("complete") && (
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
  );
}

export default ProjectPage;
