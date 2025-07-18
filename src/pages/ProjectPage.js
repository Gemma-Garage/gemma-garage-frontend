import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { API_BASE_URL, API_INFERENCE_BASE_URL, WS_BASE_URL } from '../api';
import UploadDataset from '../components/UploadDataset';
import DatasetPreview from '../components/DatasetPreview';
import TestLLM from '../components/TestLLM';
import TestLLMWithHF from '../components/TestLLMWithHF';
import HuggingFaceSettings from '../components/HuggingFaceSettings';
import HuggingFaceUpload from '../components/HuggingFaceUpload';
import { Container, Typography, Box, Button, TextField, Paper, Grid, Alert, CircularProgress, LinearProgress, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import GetAppIcon from "@mui/icons-material/GetApp";
import '../style/modern.css';

// Import components
import TrainingParameters from '../components/TrainingParameters';
import FinetuneControl from '../components/FinetuneControl';
import LossGraph from '../components/LossGraph';
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
  const [trainedModelPath, setTrainedModelPath] = useState(null);
  const [allLogs, setAllLogs] = useState([]);
  const [hfConnectionStatus, setHfConnectionStatus] = useState(null);

  const pollingIntervalRef = useRef(null);
  const requestIdRef = useRef(null);
  const lastLogTimestampRef = useRef(null);

  // Check for OAuth callback success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('hf_connected') === 'true') {
      // Clear the URL parameter
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Show success message
      setUploadStatus("Successfully connected to Hugging Face!");
      setTimeout(() => setUploadStatus(""), 3000);
    }
  }, []);

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
          setAugmentedDatasetFileName(projectData.augmentedDatasetFileName || null);
          setTrainedModelPath(projectData.trainedModelPath || null);
          
          // Smart dataset choice logic: if augmented exists and no explicit choice saved, prefer augmented
          let datasetChoice = projectData.selectedDatasetChoice;
          if (!datasetChoice && projectData.augmentedDatasetFileName) {
            datasetChoice = "augmented";
          } else if (!datasetChoice) {
            datasetChoice = "original";
          }
          setSelectedDatasetChoice(datasetChoice);
          
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
  const handleFileChange = (file) => {
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

  const handleUpload = async () => {
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
      const fileName = data.file_location.split('/').pop();

      if (fileExt === 'pdf') {
        setUploadStatus("PDF processed successfully: " + data.file_location);
      } else {
        setUploadStatus(`Dataset uploaded: ${fileName}. Ready for training.`);
      }
      // After a successful upload, set the trainable dataset name
      setTrainableDatasetName(fileName);
      // Clear any old augmented dataset state
      setAugmentedDatasetFileName(null);

      // If the uploaded file is not a JSON, it must be augmented.
      // Default the choice to 'augmented'.
      const newDatasetChoice = fileExt !== 'json' ? 'augmented' : 'original';
      setSelectedDatasetChoice(newDatasetChoice);

      // Save to Firestore
      await saveProjectProgress({
        trainableDatasetName: fileName,
        augmentedDatasetFileName: null, // Clear old augmented data
        selectedDatasetChoice: newDatasetChoice, // Save the choice
      });

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
                // Save trained model path for future reference
                if (point.model_path || point.weights_url) {
                    const modelPath = point.model_path || point.weights_url;
                    setTrainedModelPath(modelPath);
                    // Save to Firestore immediately
                    saveProjectProgress({ 
                        trainedModelPath: modelPath,
                        weightsUrl: newWeightsUrl,
                        trainingStatusMessage: latestStatusMessage,
                        requestId: currentRequestId
                    });
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
                
                // Save loss data periodically (every 10 points to avoid too many writes)
                if (combinedData.length % 10 === 0) {
                  saveProjectProgress({ 
                    lossData: combinedData,
                    trainingStatusMessage: latestStatusMessage 
                  });
                }
                
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
        // Save final training completion state
        if (newWeightsUrl || trainedModelPath) {
          saveProjectProgress({ 
            weightsUrl: newWeightsUrl,
            trainingStatusMessage: latestStatusMessage,
            lossData: lossData,
            trainingCompleted: true
          });
        }
      }

    } catch (error) {
      console.error("Error in pollLogs:", error);
      setTrainingStatus("Error updating logs.");
    }
  };

  // Check if fine-tuning is ready
  const getTrainingReadiness = () => {
    // No dataset uploaded at all
    if (!trainableDatasetName) {
      return {
        isReady: false,
        message: "Upload dataset to start fine-tuning"
      };
    }

    // Check if original dataset is JSON
    const isOriginalJson = trainableDatasetName.toLowerCase().endsWith('.json');
    
    if (selectedDatasetChoice === "augmented") {
      if (!augmentedDatasetFileName) {
        return {
          isReady: false,
          message: "Generate augmented dataset to start fine-tuning"
        };
      }
      return { isReady: true, message: "" };
    } else {
      // Using original dataset
      if (!isOriginalJson) {
        return {
          isReady: false,
          message: "Original dataset is not JSON. Please augment it first or upload a JSON file"
        };
      }
      return { isReady: true, message: "" };
    }
  };

  const startFinetuning = async () => {
    const readiness = getTrainingReadiness();
    if (!readiness.isReady) {
      alert(readiness.message);
      return;
    }

    let datasetPathForTraining;

    if (selectedDatasetChoice === "augmented") {
        datasetPathForTraining = augmentedDatasetFileName;
    } else {
        datasetPathForTraining = trainableDatasetName;
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

      // Save training start to Firestore
      await saveProjectProgress({
        requestId: data.request_id,
        trainingStatusMessage: `Training job submitted. Request ID: ${data.request_id}. Polling for logs...`,
        baseModel: modelName,
        epochs: epochs,
        learningRate: learningRate,
        loraRank: loraRank,
        datasetChoice: selectedDatasetChoice
      });

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

  const saveProjectProgress = async (updates) => {
    if (currentUser && projectId) {
      try {
        const projectDocRef = doc(db, "users", currentUser.uid, "projects", projectId);
        await updateDoc(projectDocRef, updates);
        console.log("Project updated with:", updates);
      } catch (error) {
        console.error("Error updating project:", error);
      }
    }
  };

  const handleAugmentedDatasetReady = async (augmentedGcsPath) => {
    const augmentedFilename = augmentedGcsPath.split('/').pop();
    setAugmentedDatasetFileName(augmentedFilename);
    
    // When augmented dataset is ready, automatically switch to using it
    setSelectedDatasetChoice("augmented");
    
    await saveProjectProgress({
      augmentedDatasetFileName: augmentedFilename,
      selectedDatasetChoice: "augmented" // Save the choice to use augmented
    });
  };

  const handleEpochsChange = (value) => {
    if (value === "") {
      setEpochs("");
    } else {
      const num = parseInt(value, 10);
      if (!isNaN(num)) {
        const newEpochs = num < 1 && value !== "0" ? 1 : num;
        setEpochs(newEpochs);
        // Save parameter changes
        saveProjectProgress({ epochs: newEpochs });
      } else if (value === "0") {
        setEpochs(0);
        saveProjectProgress({ epochs: 0 });
      }
    }
  };

  const handleLearningRateChange = (value) => {
    setLearningRate(value);
    saveProjectProgress({ learningRate: value });
  };

  const handleLoraRankChange = (value) => {
    setLoraRank(value);
    saveProjectProgress({ loraRank: value });
  };

  const handleModelNameChange = (value) => {
    setModelName(value);
    saveProjectProgress({ baseModel: value });
  };

  const handleDatasetChoiceChange = (choice) => {
    setSelectedDatasetChoice(choice);
    saveProjectProgress({ selectedDatasetChoice: choice });
  };

  // ... other handlers would be copied from App.js

  if (!selectedProjectData) {
    return (
      <div className="modern-page">
        <div className="modern-container">
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div className="d-flex align-center gap-md">
              <CircularProgress sx={{ color: 'var(--primary-color)' }} />
              <Typography className="modern-text">Loading project...</Typography>
            </div>
          </Box>
        </div>
      </div>
    );
  }

  return (
    <div className="modern-page">
      <div className="modern-page-header">
        <div className="modern-container">
          <Typography variant="h4" className="modern-title text-center mb-0">
            {selectedProjectData.displayName}
          </Typography>
          <Typography className="modern-text text-center modern-text-muted">
            Project ID: {projectId}
          </Typography>
        </div>
      </div>
      
      <div className="modern-page-content">
        <div className="modern-container">
          {/* Project Status */}
          {(trainableDatasetName || augmentedDatasetFileName || trainedModelPath) && (
            <div className="modern-card">
              <div className="modern-card-header">
                <Typography className="modern-card-title">Project Assets</Typography>
                <Typography className="modern-card-subtitle">
                  Saved datasets and trained models for this project
                </Typography>
              </div>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {trainableDatasetName && (
                  <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
                    <strong>Original Dataset:</strong> {trainableDatasetName.split('/').pop()}
                  </Alert>
                )}
                {augmentedDatasetFileName && (
                  <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
                    <strong>Augmented Dataset:</strong> {augmentedDatasetFileName.split('/').pop()}
                  </Alert>
                )}
                {trainedModelPath && (
                  <Alert severity="success" sx={{ fontSize: '0.875rem' }}>
                    <strong>Trained Model:</strong> {trainedModelPath.split('/').pop()} ✅
                  </Alert>
                )}
              </Box>
            </div>
          )}
          
          {/* Hugging Face Integration */}
          <div className="modern-card">
            <HuggingFaceSettings 
              currentUser={currentUser} 
              projectId={projectId}
              onConnectionStatusChange={setHfConnectionStatus}
            />
          </div>
          
          {/* Project Controls */}
          <div className="modern-card">
            <div className="modern-card-header">
              <Typography className="modern-card-title">Dataset & Training</Typography>
              <Typography className="modern-card-subtitle">
                Upload your dataset and configure training parameters
              </Typography>
            </div>
            
            <UploadDataset 
              datasetFile={datasetFile}
              trainableDatasetName={trainableDatasetName}
              onFileChange={handleFileChange}
              uploadStatus={uploadStatus}
              onUpload={handleUpload}
            />
            
            <Box sx={{ mt: 3 }}>
              <DatasetPreview 
                dataset_path={trainableDatasetName}
                onDatasetChoiceChange={handleDatasetChoiceChange}
                selectedDatasetChoice={selectedDatasetChoice}
                onAugmentedDatasetReady={handleAugmentedDatasetReady}
                augmentedDatasetFileName={augmentedDatasetFileName}
              />
              {/* Debug info */}
              {process.env.NODE_ENV === 'development' && (
                <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="caption" display="block">
                    <strong>Debug:</strong> trainableDatasetName={trainableDatasetName}
                  </Typography>
                  <Typography variant="caption" display="block">
                    augmentedDatasetFileName={augmentedDatasetFileName}
                  </Typography>
                  <Typography variant="caption" display="block">
                    selectedDatasetChoice={selectedDatasetChoice}
                  </Typography>
                </Box>
              )}
            </Box>
          </div>
          
          {/* Training Parameters */}
          <div className="modern-card">
            <TrainingParameters
              modelName={modelName}
              epochs={epochs}
              learningRate={learningRate}
              loraRank={loraRank}
              onModelNameChange={handleModelNameChange}
              onEpochsChange={handleEpochsChange}
              onLearningRateChange={handleLearningRateChange}
              onLoraRankChange={handleLoraRankChange}
            />
          </div>
          
          {/* Training Control */}
          <div className="modern-card">
            <FinetuneControl 
              onStart={startFinetuning}
              wsStatus={trainingStatus}
              progress={progress}
              allLogs={allLogs}
              trainingReadiness={getTrainingReadiness()}
            />
          </div>
          
          {/* Loss Graph */}
          <div className="modern-card">
            <LossGraph lossData={lossData} />
          </div>
          
          {/* Download Section */}
          {currentRequestId && trainingStatus.toLowerCase().includes("complete") && (
            <div className="modern-card">
              <div className="modern-card-header">
                <Typography className="modern-card-title">Download Model</Typography>
                <Typography className="modern-card-subtitle">
                  Your model training is complete! Download your fine-tuned model files.
                </Typography>
              </div>
              
              <Button
                variant="contained"
                onClick={downloadWeights}
                startIcon={<GetAppIcon />}
                className="modern-btn modern-btn-primary"
                sx={{ 
                  backgroundColor: "var(--primary-color)", 
                  "&:hover": { backgroundColor: "var(--primary-hover)" }
                }}
              >
                Download All Model Files (ZIP)
              </Button>
            </div>
          )}
          
          {/* HuggingFace Upload */}
          <div className="modern-card">
            <HuggingFaceUpload 
              currentRequestId={currentRequestId}
              trainingStatus={trainingStatus}
              modelName={modelName}
              trainedModelPath={trainedModelPath}
              connectionStatus={hfConnectionStatus}
            />
          </div>
          
          {/* Testing Section */}
          <div className="modern-card">
            <TestLLM currentRequestId={currentRequestId} currentBaseModel={modelName} />
          </div>
          
          <div className="modern-card">
            <TestLLMWithHF 
              currentUser={currentUser}
              currentRequestId={currentRequestId} 
              currentBaseModel={modelName}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectPage;
