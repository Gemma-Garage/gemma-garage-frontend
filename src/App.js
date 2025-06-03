import React, { useState, useRef } from "react";
import Header from "./components/Header";
import UploadDataset from "./components/UploadDataset";
import TrainingParameters from "./components/TrainingParameters";
import FinetuneControl from "./components/FinetuneControl";
import LossGraph from "./components/LossGraph";
import Sidebar from "./components/Sidebar";
import TestLLM from "./components/TestLLM";
import DatasetPreview from "./components/DatasetPreview";
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

import { Paper, Typography, Button } from "@mui/material";
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

  // Handle file changes
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
                            newProg.current_epoch = point.current_epoch;
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
            if (point && typeof point.loss === 'number' && point.timestamp) {
              newLossPointsForGraph.push({
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


  // downloadWeights function remains largely the same, ensure API_BASE_URL is used.
  const downloadWeights = async () => {
    // weightsUrl is now the GCS directory path, set when training completes.
    // currentRequestId is also available and should be used.
    if (!currentRequestId) {
      setTrainingStatus("Error: No request ID found for download.");
      console.error("Download weights called without a currentRequestId.");
      return;
    }

    setTrainingStatus("Preparing download links for model artifacts..."); // User feedback
    try {
      console.log("Requesting download links for request_id:", currentRequestId);
      
      const response = await fetch(`${API_BASE_URL}/download/download_weights`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // Send request_id to the backend
        body: JSON.stringify({ request_id: currentRequestId }), 
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Unknown server error" }));
        setTrainingStatus(`Download failed: ${errorData.detail || "Could not retrieve file links"}`);
        throw new Error(errorData.detail || "Could not retrieve file links from server");
      }
      
      const data = await response.json(); // Expect { files: [{ filename: "...", download_url: "..." }, ...] }
      
      if (data.files && Array.isArray(data.files) && data.files.length > 0) {
        setTrainingStatus(`Starting download of ${data.files.length} model files...`);
        data.files.forEach((file, index) => {
          // Optional: Add a small delay for each download if needed, though browsers usually handle this.
          // setTimeout(() => {
            const link = document.createElement("a");
            link.href = file.download_url; // This is the GCS signed URL for the specific file
            link.download = file.filename; // Use the filename from the backend for the download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            console.log(`Download initiated for: ${file.filename}`);
          // }, index * 1000); // Example: 1-second delay between downloads
        });
        setTrainingStatus("All model file downloads initiated.");
      } else if (data.files && data.files.length === 0) {
        setTrainingStatus("No model files found for download at the GCS location.");
        console.warn("Backend returned an empty list of files for download for request_id:", currentRequestId);
      } else {
        setTrainingStatus("Download failed: Invalid response from server or no files found.");
        throw new Error("Invalid response from server: 'files' array not found or empty.");
      }
    } catch (error) {
      console.error("Error downloading model artifacts:", error);
      setTrainingStatus(`Error downloading model artifacts: ${error.message}`);
    }
  };
  
  

  return (
    <div className="container">
      {/* <Sidebar /> */}
      <div className="main-content">
        <Header />
        <UploadDataset
          datasetFile={datasetFile}
          onFileChange={handleFileChange}
          uploadStatus={uploadStatus}
          onUpload={uploadDataset}
        />
        <DatasetPreview 
          datasetFile={datasetFile}
          dataset_path={datasetFile ? (uploadStatus.startsWith("Dataset uploaded: ") ? uploadStatus.replace("Dataset uploaded: ", "").replace(". Ready for training.", "") : datasetFile.name) : null}
        />
        <TrainingParameters
          modelName={modelName}
          epochs={epochs}
          learningRate={learningRate}
          loraRank={loraRank}
          onModelNameChange={setModelName}
          onEpochsChange={setEpochs}
          onLearningRateChange={setLearningRate}
          onLoraRankChange={setLoraRank}
        />
        <FinetuneControl 
            onStart={startFinetuning} 
            wsStatus={trainingStatus} 
            progress={progress} // Pass progress state
        /> 
        <LossGraph lossData={lossData} />
        
        {/* Use MUI for Download Weights button */}
        {weightsUrl && (
          <Paper elevation={3} sx={{ padding: 3, marginBottom: 2, backgroundColor: "#f9f9f9" }}>
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
              Download Weights
            </Button>
          </Paper>
        )}
        <TestLLM />
      </div>
    </div>
  );
}

export default App;
