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
  const [trainingStatus, setTrainingStatus] = useState(""); // Renamed from wsStatus
  const [lossData, setLossData] = useState([]);
  const [weightsUrl, setWeightsUrl] = useState(null);
  // const ws = useRef(null); // WebSocket no longer used
  const [currentRequestId, setCurrentRequestId] = useState(null);
  const [lastLogTimestamp, setLastLogTimestamp] = useState(null);
  const pollingIntervalRef = useRef(null); // To store interval ID for cleanup

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
    let processedNewPoints = []; // Initialize processedNewPoints
    try {
      let url = `${API_BASE_URL}/finetune/logs/${requestId}`;
      if (sinceTimestamp) {
        // Ensure the timestamp is properly URI encoded, especially if it contains '+'
        url += `?since=${encodeURIComponent(sinceTimestamp)}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText })); // Graceful error parsing
        console.error("Error fetching logs:", errorData.detail || response.statusText);
        setTrainingStatus(`Error fetching logs: ${errorData.detail || response.statusText}`);
        if (response.status === 404) {
            stopPollingLogs();
            setTrainingStatus("Training ID not found. Stopping log updates.");
        }
        return;
      }

      const data = await response.json();
      
      if (data.loss_values && Array.isArray(data.loss_values)) {
        // The existing definition of processedNewPoints will now assign to the outer-scoped variable
        processedNewPoints = data.loss_values
          .map(point => {
            if (point && typeof point.loss === 'number' && point.timestamp) { // Ensure timestamp and loss are valid
              return {
                time: new Date(point.timestamp).toLocaleTimeString(), // Formatted for display
                loss: point.loss,
                rawTimestamp: point.timestamp // Keep the original ISO string for uniqueness
              };
            }
            console.warn("Skipping invalid log point:", point);
            return null;
          })
          .filter(point => point !== null);

        if (processedNewPoints.length > 0) {
          setLossData(prevLossData => {
            // Use a Set of existing rawTimestamps for robust duplicate checking
            const existingRawTimestamps = new Set(prevLossData.map(p => p.rawTimestamp));
            
            const uniqueNewPointsToPlot = processedNewPoints.filter(p => !existingRawTimestamps.has(p.rawTimestamp));
            
            if (uniqueNewPointsToPlot.length > 0) {
                // Sort all points by rawTimestamp before returning, ensuring chronological order for the graph
                const combinedData = [...prevLossData, ...uniqueNewPointsToPlot];
                combinedData.sort((a, b) => new Date(a.rawTimestamp) - new Date(b.rawTimestamp));
                return combinedData;
            }
            return prevLossData; // No new unique points, return previous state to avoid re-render
          });
        }
      }
      
      if (data.latest_timestamp) {
        setLastLogTimestamp(data.latest_timestamp);
      } else if (processedNewPoints.length > 0) { // Check length directly, as it's initialized
        // Fallback: if backend doesn\'t send latest_timestamp, use the last one from the current batch
        // Ensure data is sorted by timestamp if relying on this
        // The backend\'s extract_loss_from_logs already sorts, so this should be safe.
        setLastLogTimestamp(processedNewPoints[processedNewPoints.length - 1].rawTimestamp);
      }
      
      setTrainingStatus("Training in progress... Logs updated."); 

      // Check for a completion message or condition if defined by the backend
      // For example, if a log entry contains { "status": "complete", "weights_url": "..." }
      if (data.loss_values && data.loss_values.some(log => log.status === 'complete' || log.message?.includes('Training complete'))) {
        setTrainingStatus("Training complete! Processing final results...");
        stopPollingLogs();
        // Potentially extract weights_url if provided in such a message
        const completionLog = data.loss_values.find(log => log.status === 'complete' || log.message?.includes('Training complete'));
        if (completionLog && completionLog.weights_url) {
          setWeightsUrl(completionLog.weights_url);
          setTrainingStatus("Training complete! Weights ready for download.");
        }
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
    if (!weightsUrl) return; // weightsUrl needs to be set by a log message or another mechanism
    // For now, this part is less relevant as log polling doesn't directly set weightsUrl.
    // This would typically be set when training is "complete" and backend provides the path.
    // Let's assume a log message might eventually contain this.
    // Or, a separate endpoint `/status/{request_id}` could provide it.
    // For now, keeping it as is, but its trigger is unclear in the new flow.
    // A log message like "status: complete, weights_url: ..." would be needed.
    // Or the backend could push this information to the frontend via a dedicated endpoint.
    setTrainingStatus("Preparing download..."); // User feedback
    try {
      console.log("Downloading weights from", weightsUrl);
      // This endpoint might need to change if weights are now tied to a request_id
      // For example: /download/weights/{request_id}
      // Or the backend /logs endpoint could return a weights_path when complete.
      // Assuming the old /download/download_weights still works if weightsUrl is a full path.
      const response = await fetch(`${API_BASE_URL}/download/download_weights`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ weights_path: weightsUrl }), // This payload might need adjustment
      });
      if (!response.ok) {
        const errorData = await response.json();
        setTrainingStatus(`Download failed: ${errorData.detail || "File not available"}`);
        throw new Error(errorData.detail || "File not available");
      }
      const data = await response.json();
      const link = document.createElement("a");
      link.href = data.download_link;
      link.download = "fine_tuned_weights.pth"; 
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTrainingStatus("Weights downloaded.");
    } catch (error) {
      console.error("Error downloading file", error);
      setTrainingStatus(`Error downloading weights: ${error.message}`);
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
          // dataset_path prop might need adjustment if it expects a full path vs filename
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
        {/* Changed wsStatus to trainingStatus */}
        <FinetuneControl onStart={startFinetuning} wsStatus={trainingStatus} /> 
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
