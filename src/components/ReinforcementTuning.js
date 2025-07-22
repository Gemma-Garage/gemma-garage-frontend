import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { API_BASE_URL } from '../api';
import UploadDataset from './UploadDataset';
import DatasetPreview from './DatasetPreview';
import TrainingParameters from './TrainingParameters';
import FinetuneControl from './FinetuneControl';
import LossGraph from './LossGraph';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  TextField, 
  Paper, 
  Grid, 
  Alert, 
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextareaAutosize
} from '@mui/material';
import GetAppIcon from "@mui/icons-material/GetApp";
import '../style/modern.css';

function ReinforcementTuning({ currentUser }) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  // State variables
  const [datasetFile, setDatasetFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [modelName, setModelName] = useState("google/gemma-3-1b-pt");
  const [epochs, setEpochs] = useState(1);
  const [learningRate, setLearningRate] = useState(0.0002);
  const [loraRank, setLoraRank] = useState(4);
  const [trainingStatus, setTrainingStatus] = useState("");
  const [lossData, setLossData] = useState([]);
  const [rewardData, setRewardData] = useState([]);
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
  const [customRubric, setCustomRubric] = useState("");

  const pollingIntervalRef = useRef(null);
  const requestIdRef = useRef(null);
  const lastLogTimestampRef = useRef(null);

  // Helper to check if training is active
  const isTrainingActive = status =>
    status && (
      status.toLowerCase().includes("in progress") ||
      status.toLowerCase().includes("submitted") ||
      status.toLowerCase().includes("polling for logs")
    ) &&
    !status.toLowerCase().includes("complete") &&
    !status.toLowerCase().includes("error");

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
          setTrainableDatasetName(projectData.trainableDatasetName ? projectData.trainableDatasetName.split('/').pop() : null);
          setAugmentedDatasetFileName(projectData.augmentedDatasetFileName ? projectData.augmentedDatasetFileName.split('/').pop() : null);
          setTrainedModelPath(projectData.trainedModelPath || null);
          setCustomRubric(projectData.customRubric || "");
          
          // Smart dataset choice logic
          let datasetChoice = projectData.selectedDatasetChoice;
          const isOriginalJson = projectData.trainableDatasetName ? projectData.trainableDatasetName.toLowerCase().endsWith('.json') : false;
          
          if (!isOriginalJson && projectData.augmentedDatasetFileName) {
            datasetChoice = "augmented";
          } else if (!datasetChoice && projectData.augmentedDatasetFileName) {
            datasetChoice = "augmented";
          } else if (!datasetChoice) {
            datasetChoice = "original";
          }
          setSelectedDatasetChoice(datasetChoice);
          
          // Save the corrected choice back to database if it was changed
          if (datasetChoice !== projectData.selectedDatasetChoice) {
            setTimeout(() => {
              saveProjectProgress({ selectedDatasetChoice: datasetChoice });
            }, 100);
          }
          
          setEpochs(projectData.epochs || 1);
          setLearningRate(projectData.learningRate || 0.0002);
          setLoraRank(projectData.loraRank || 4);
          setTrainingStatus(projectData.trainingStatusMessage || "Ready for RL training.");
          setLossData(projectData.lossData || []);
          setRewardData(projectData.rewardData || []);
          setWeightsUrl(projectData.weightsUrl || null);
          setCurrentRequestId(projectData.requestId || null);
          setModelName(projectData.baseModel || "google/gemma-3-1b-pt");

          if (projectData.requestId) {
            requestIdRef.current = projectData.requestId;
            // Only start polling if training is actually in progress
            if (
              !pollingIntervalRef.current &&
              isTrainingActive(projectData.trainingStatusMessage)
            ) {
              console.log("Restarting polling for existing RL training job:", projectData.requestId);
              pollingIntervalRef.current = setInterval(() => {
                if (requestIdRef.current) {
                  pollLogs(requestIdRef.current, lastLogTimestampRef.current);
                }
              }, 10000); // 10 seconds
            }
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

  // File upload handlers
  const handleFileChange = (file) => {
    if (file) {
      setUploadStatus("");
      
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
        setUploadStatus(`Dataset uploaded: ${fileName}. Ready for RL training.`);
      }
      
      setTrainableDatasetName(fileName);
      setAugmentedDatasetFileName(null);

      const newDatasetChoice = fileExt !== 'json' ? 'augmented' : 'original';
      setSelectedDatasetChoice(newDatasetChoice);

      await saveProjectProgress({
        trainableDatasetName: fileName,
        augmentedDatasetFileName: null,
        selectedDatasetChoice: newDatasetChoice,
      });

    } catch (error) {
      console.error("Error uploading file", error);
      setUploadStatus("Error: " + error.message);
    }
  };

  // Polling and log handling
  const stopPollingLogs = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const pollLogs = async (requestId, sinceTimestamp) => {
    try {
      let url = `${API_BASE_URL}/rl_finetune/logs/${requestId}`;
      if (sinceTimestamp) {
        url += `?since=${encodeURIComponent(sinceTimestamp)}`;
      }
    
      const response = await fetch(url);
      console.log("Polling RL logs from:", url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        console.error("Error fetching RL logs:", errorData.detail || response.statusText);
        setTrainingStatus(`Error fetching logs: ${errorData.detail || response.statusText}`);
        if (response.status === 404) {
            stopPollingLogs();
            setTrainingStatus("Training ID not found. Stopping log updates.");
        }
        return;
      }

      const data = await response.json();
      console.log('[RL pollLogs] Received data:', data);
      let latestStatusMessage = trainingStatus; 
      let trainingCompleted = false;
      let newWeightsUrl = weightsUrl;
      const newLossPointsForGraph = [];
      const newRewardPointsForGraph = [];

      if (data.loss_values && Array.isArray(data.loss_values)) {
        setAllLogs(prevLogs => {
          const existingTimestamps = new Set(prevLogs.map(l => l.timestamp));
          const newLogs = data.loss_values.filter(l => l.timestamp && !existingTimestamps.has(l.timestamp));
          return [...prevLogs, ...newLogs];
        });
        
        data.loss_values.forEach(point => {
            if (point && point.status_message) {
                latestStatusMessage = point.status_message;
                
                const hasProgressInfo = point.current_step !== undefined ||
                                        point.total_steps !== undefined ||
                                        point.current_epoch !== undefined ||
                                        point.total_epochs !== undefined;

                if (hasProgressInfo) {
                    setProgress(prevProgress => {
                        const newProg = { ...prevProgress };
                        if (point.current_step !== undefined) newProg.current_step = point.current_step;
                        if (point.total_steps !== undefined) newProg.total_steps = point.total_steps;
                        if (point.current_epoch !== undefined) newProg.current_epoch = point.current_epoch;
                        if (point.total_epochs !== undefined) newProg.total_epochs = point.total_epochs;
                        return newProg;
                    });
                }
            }

            if (point && point.status === 'complete') {
                trainingCompleted = true;
                latestStatusMessage = point.status_message || "RL training complete! Processing final results...";
                if (point.weights_url) {
                    newWeightsUrl = point.weights_url;
                }
                if (point.model_path || point.weights_url) {
                    const modelPath = point.model_path || point.weights_url;
                    setTrainedModelPath(modelPath);
                    saveProjectProgress({ 
                        trainedModelPath: modelPath,
                        weightsUrl: newWeightsUrl,
                        trainingStatusMessage: latestStatusMessage,
                        requestId: currentRequestId
                    });
                }
            }

            // Check for loss data for the graph
            if (point && typeof point.loss === 'number' && point.current_epoch !== undefined) {
              newLossPointsForGraph.push({
                current_epoch: point.current_epoch,
                time: new Date(point.timestamp).toLocaleTimeString(),
                loss: point.loss,
                rawTimestamp: point.timestamp
              });
            }

            // Check for reward data for the graph
            if (point && typeof point.reward === 'number' && point.current_epoch !== undefined) {
              newRewardPointsForGraph.push({
                current_epoch: point.current_epoch,
                time: new Date(point.timestamp).toLocaleTimeString(),
                reward: point.reward,
                rawTimestamp: point.timestamp
              });
            }
        });

        // In pollLogs, update lossData and rewardData state, but only call saveProjectProgress for these arrays when training is completed.
        if (newLossPointsForGraph.length > 0) {
          setLossData(prevLossData => {
            const existingRawTimestamps = new Set(prevLossData.map(p => p.rawTimestamp));
            const uniqueNewPointsToPlot = newLossPointsForGraph.filter(p => !existingRawTimestamps.has(p.rawTimestamp));
            if (uniqueNewPointsToPlot.length > 0) {
              let combinedData = [...prevLossData, ...uniqueNewPointsToPlot];
              // Limit to last 200 points for performance
              if (combinedData.length > 200) combinedData = combinedData.slice(combinedData.length - 200);
              return combinedData;
            }
            return prevLossData;
          });
        }
        if (newRewardPointsForGraph.length > 0) {
          setRewardData(prevRewardData => {
            const existingRawTimestamps = new Set(prevRewardData.map(p => p.rawTimestamp));
            const uniqueNewPointsToPlot = newRewardPointsForGraph.filter(p => !existingRawTimestamps.has(p.rawTimestamp));
            if (uniqueNewPointsToPlot.length > 0) {
              let combinedData = [...prevRewardData, ...uniqueNewPointsToPlot];
              // Limit to last 200 points for performance
              if (combinedData.length > 200) combinedData = combinedData.slice(combinedData.length - 200);
              return combinedData;
            }
            return prevRewardData;
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
      }
      
      // Only save lossData and rewardData to Firestore when training is completed
      if (trainingCompleted) {
        stopPollingLogs();
        if (newWeightsUrl) {
          setWeightsUrl(newWeightsUrl);
        }
        if (newWeightsUrl || trainedModelPath) {
          saveProjectProgress({ 
            weightsUrl: newWeightsUrl,
            trainingStatusMessage: latestStatusMessage,
            lossData: lossData,
            rewardData: rewardData,
            trainingCompleted: true
          });
        }
      }

    } catch (error) {
      console.error("Error in pollLogs:", error);
      setTrainingStatus("Error updating logs.");
    }
  };

  // Check if RL fine-tuning is ready
  const getTrainingReadiness = () => {
    if (!trainableDatasetName) {
      return {
        isReady: false,
        message: "Upload dataset to start RL fine-tuning"
      };
    }

    if (!customRubric.trim()) {
      return {
        isReady: false,
        message: "Please provide a custom rubric for reward evaluation"
      };
    }

    const isOriginalJson = trainableDatasetName.toLowerCase().endsWith('.json');
    
    if (selectedDatasetChoice === "augmented") {
      if (!augmentedDatasetFileName) {
        return {
          isReady: false,
          message: "Generate augmented dataset to start RL fine-tuning"
        };
      }
      return { isReady: true, message: "" };
    } else {
      if (!isOriginalJson) {
        if (augmentedDatasetFileName) {
          return {
            isReady: false,
            message: "Original dataset is not JSON. Please switch to 'Augmented' option below or upload a JSON file"
          };
        } else {
          return {
            isReady: false,
            message: "Original dataset is not JSON. Please augment it first or upload a JSON file"
          };
        }
      }
      return { isReady: true, message: "" };
    }
  };

  const startRLFinetuning = async () => {
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

    setTrainingStatus("Submitting RL training job...");
    setLossData([]);
    setRewardData([]);
    setLastLogTimestamp(null);
    lastLogTimestampRef.current = null;
    setCurrentRequestId(null);
    requestIdRef.current = null;
    setProgress({ current_step: 0, total_steps: 0, current_epoch: 0, total_epochs: 0 });
    stopPollingLogs();
    setAllLogs([]);

    const payload = {
      model_name: modelName,
      dataset_path: datasetPathForTraining,
      epochs: epochs,
      learning_rate: learningRate,
      lora_rank: loraRank,
      dataset_choice: selectedDatasetChoice,
      custom_rubric: customRubric,
    };
    console.log("Starting RL fine-tuning with payload:", payload);
    try {
      const response = await fetch(`${API_BASE_URL}/rl_finetune/train`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to start RL training job");
      }

      const data = await response.json();
      setTrainingStatus(`RL training job submitted. Request ID: ${data.request_id}. Polling for logs...`);
      
      setCurrentRequestId(data.request_id);
      requestIdRef.current = data.request_id;
      setLastLogTimestamp(null);
      lastLogTimestampRef.current = null;

      await saveProjectProgress({
        requestId: data.request_id,
        trainingStatusMessage: `RL training job submitted. Request ID: ${data.request_id}. Polling for logs...`,
        baseModel: modelName,
        epochs: epochs,
        learningRate: learningRate,
        loraRank: loraRank,
        datasetChoice: selectedDatasetChoice,
        customRubric: customRubric
      });

      pollingIntervalRef.current = setInterval(() => {
        if (requestIdRef.current) {
          pollLogs(requestIdRef.current, lastLogTimestampRef.current);
        }
      }, 10000); // 10 seconds

    } catch (error) {
      console.error("Error starting RL fine-tuning:", error);
      setTrainingStatus(`Error: ${error.message}`);
      stopPollingLogs();
    }
  };

  const downloadWeights = async () => {
    if (!currentRequestId && !trainedModelPath) {
      setTrainingStatus("Error: No request ID or trained model path found for download.");
      return;
    }
    
    const requestIdForDownload = currentRequestId || (trainedModelPath ? 
      (() => {
        const pathParts = trainedModelPath.split('/');
        const modelIndex = pathParts.findIndex(part => part === 'model');
        if (modelIndex !== -1 && modelIndex + 1 < pathParts.length) {
          return pathParts[modelIndex + 1];
        }
        return pathParts.find(part => part.length > 20 && part.includes('-')) || 
               pathParts.pop().replace('final_model', '').replace(/[^a-zA-Z0-9-]/g, '');
      })()
    : null);
    
    if (!requestIdForDownload) {
      setTrainingStatus("Error: Could not determine request ID for download.");
      return;
    }
    setTrainingStatus("Preparing download ZIP for model artifacts...");
    try {
      const response = await fetch(`${API_BASE_URL}/download/download_weights_zip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestIdForDownload })
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Failed to get ZIP download");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rl_model_${requestIdForDownload}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setTrainingStatus("RL model ZIP download started.");
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
    setSelectedDatasetChoice("augmented");
    
    await saveProjectProgress({
      augmentedDatasetFileName: augmentedFilename,
      selectedDatasetChoice: "augmented"
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

  const handleCustomRubricChange = (value) => {
    setCustomRubric(value);
    saveProjectProgress({ customRubric: value });
  };

  if (!selectedProjectData) {
    return (
      <div className="modern-page">
        <div className="modern-container">
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div className="d-flex align-center gap-md">
              <CircularProgress sx={{ color: 'var(--primary-color)' }} />
              <Typography className="modern-text">Loading RL project...</Typography>
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
            {selectedProjectData.displayName} - Reinforcement Learning
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
                  Saved datasets and trained RL models for this project
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
                    <strong>Trained RL Model:</strong> {trainedModelPath.split('/').pop()} ✅
                  </Alert>
                )}
              </Box>
            </div>
          )}
          
          {/* Dataset Upload */}
          <div className="modern-card">
            <div className="modern-card-header">
              <Typography className="modern-card-title">Dataset & Training</Typography>
              <Typography className="modern-card-subtitle">
                Upload your dataset and configure RL training parameters
              </Typography>
            </div>
            
            <UploadDataset 
              datasetFile={datasetFile}
              trainableDatasetName={trainableDatasetName}
              onFileChange={handleFileChange}
              uploadStatus={uploadStatus}
              onUpload={handleUpload}
            />
            
            {!trainableDatasetName && (
              <Box sx={{ mt: 3 }}>
                <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
                  <strong>Next Step:</strong> Upload a dataset above to get started with RL fine-tuning. 
                  You can upload JSON, CSV, PDF, PPT, PPTX, DOCX, HTML, or TXT files.
                </Alert>
              </Box>
            )}
            
            {/* {trainableDatasetName && (
              <Box sx={{ mt: 3 }}>
                <DatasetPreview 
                  dataset_path={trainableDatasetName}
                  onDatasetChoiceChange={handleDatasetChoiceChange}
                  selectedDatasetChoice={selectedDatasetChoice}
                  onAugmentedDatasetReady={handleAugmentedDatasetReady}
                  augmentedDatasetFileName={augmentedDatasetFileName}
                />
              </Box>
            )} */}
          </div>

          {/* Custom Rubric */}
          <div className="modern-card">
            <div className="modern-card-header">
              <Typography className="modern-card-title">Custom Reward Rubric</Typography>
              <Typography className="modern-card-subtitle">
                Define the criteria for evaluating model responses during RL training
              </Typography>
            </div>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This rubric will be used by the reward function to evaluate model responses. 
                Be specific about what constitutes a good response.
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={6}
                label="Custom Rubric"
                placeholder="Example: Evaluate responses based on:
1. Accuracy of the answer (0-1)
2. Completeness of explanation (0-1) 
3. Logical reasoning (0-1)
4. Clarity of expression (0-1)

A good response should be accurate, complete, well-reasoned, and clearly expressed."
                value={customRubric}
                onChange={(e) => handleCustomRubricChange(e.target.value)}
                variant="outlined"
                sx={{ mb: 2 }}
              />
              
              <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
                <strong>Tip:</strong> The more specific and detailed your rubric, the better the RL training will be at learning the desired behavior.
              </Alert>
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
              onStart={startRLFinetuning}
              wsStatus={trainingStatus}
              progress={progress}
              allLogs={allLogs}
              trainingReadiness={getTrainingReadiness()}
            />
          </div>
          
          {/* Loss Graph */}
          <div className="modern-card">
            <LossGraph lossData={lossData} title="Training Loss" />
          </div>

          {/* Reward Graph */}
          <div className="modern-card">
            <LossGraph lossData={rewardData} title="Reward Progress" />
          </div>
          
          {/* Download Section */}
          {((currentRequestId && trainingStatus.toLowerCase().includes("complete")) || trainedModelPath) && (
            <div className="modern-card">
              <div className="modern-card-header">
                <Typography className="modern-card-title">Download RL Model</Typography>
                <Typography className="modern-card-subtitle">
                  Your RL model training is complete! Download your fine-tuned model files.
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
                Download All RL Model Files (ZIP)
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReinforcementTuning;
