import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  TextField, // Added TextField
  Tabs,
  Tab,
  RadioGroup,
  FormControlLabel,
  Radio,
  Slider,
} from "@mui/material";
import { API_BASE_URL } from "../api";

const DatasetPreview = ({ datasetFile, dataset_path, onDatasetChoiceChange, selectedDatasetChoice, onAugmentedDatasetReady }) => {
  const [previewData, setPreviewData] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [totalEntries, setTotalEntries] = useState(0);
  
  // New state for Gemma-based augmentation
  const [fineTuningTaskPrompt, setFineTuningTaskPrompt] = useState("");
  const [isAugmenting, setIsAugmenting] = useState(false);
  const [augmentedDataPreview, setAugmentedDataPreview] = useState([]);
  const [augmentedDatasetGCSPath, setAugmentedDatasetGCSPath] = useState(null);
  const [errorAugmenting, setErrorAugmenting] = useState(null);
  const [totalAugmentedEntries, setTotalAugmentedEntries] = useState(0);
  const [activeTab, setActiveTab] = useState(0); // New state for active tab
  const [summary, setSummary] = useState(null); // New state for summary
  const [datasetChoice, setDatasetChoice] = useState("original"); // 'original' or 'augmented'
  const [qaPairsNbr, setQaPairsNbr] = useState(100);

  useEffect(() => {
    if (dataset_path && dataset_path !== 'undefined' && dataset_path !== 'null') {
      loadOriginalDatasetPreview();
      // Reset augmentation states if original dataset changes
      setAugmentedDataPreview([]);
      setAugmentedDatasetGCSPath(null);
      onAugmentedDatasetReady(null); // Notify parent
      setErrorAugmenting(null);
      setFineTuningTaskPrompt("");
      setTotalAugmentedEntries(0);
    }
  }, [dataset_path]);

  const loadOriginalDatasetPreview = async () => {
    if (!dataset_path || dataset_path === 'undefined' || dataset_path === 'null') return;
    
    setLoadingPreview(true);
    try {
      console.log("Loading original dataset preview from:", encodeURIComponent(dataset_path));
      const response = await fetch(`${API_BASE_URL}/dataset/preview?path=${encodeURIComponent(dataset_path)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.preview && data.full_count !== undefined) {
          setPreviewData(data.preview);            // use full preview batch
          setTotalEntries(data.full_count);
        } else if (Array.isArray(data)) { // Fallback
          setPreviewData(data);             // show all fetched items for scrolling
          setTotalEntries(data.length);
        } else {
          setPreviewData([]);
          setTotalEntries(0);
          console.warn("Unexpected preview data format for original dataset:", data);
        }
      } else {
        console.error("Error loading original dataset preview: Server returned", response.status);
        setPreviewData([]);
        setTotalEntries(0);
      }
    } catch (error) {
      console.error("Error loading original dataset preview:", error);
      setPreviewData([]);
      setTotalEntries(0);
    }
    setLoadingPreview(false);
  };

  const handleGenerateAugmentedDataset = async () => {
    if (!dataset_path || !fineTuningTaskPrompt.trim()) {
      setErrorAugmenting("Please ensure a dataset is uploaded and a task prompt is provided.");
      return;
    }
    setIsAugmenting(true);
    setErrorAugmenting(null);
    setAugmentedDataPreview([]);
    setAugmentedDatasetGCSPath(null);
    setTotalAugmentedEntries(0);
    setSummary(null);
    try {
      const response = await fetch(`${API_BASE_URL}/dataset/augment-unified`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dataset_gcs_path: dataset_path,
          fine_tuning_task_prompt: fineTuningTaskPrompt,
          model_choice: "gemini-1.5-flash",
          qa_pairs: qaPairsNbr,
        }),
      });
      
      console.log("Augmentation request sent to server:", {
        dataset_gcs_path: dataset_path,
        fine_tuning_task_prompt: fineTuningTaskPrompt,
        model_choice: "gemini-1.5-flash",
        qa_pairs: qaPairsNbr,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Error augmenting dataset. Server response not JSON." }));
        let detail = errorData.detail || `Error augmenting dataset. Status: ${response.status}`;
        if (detail.includes("response contains a valid `Part`, but none was returned")) {
            detail = "The data augmentation request was blocked by the content safety filter. Please try rephrasing your fine-tuning task prompt to be less sensitive.";
        }
        throw new Error(detail);
      }

      const data = await response.json();
      if (data.preview_augmented_data && data.augmented_dataset_gcs_path) {
        setAugmentedDataPreview(data.preview_augmented_data.preview || []);
        setTotalAugmentedEntries(data.preview_augmented_data.full_count || (data.preview_augmented_data.preview || []).length);
        setAugmentedDatasetGCSPath(data.augmented_dataset_gcs_path);
        onAugmentedDatasetReady(data.augmented_dataset_gcs_path); // Notify parent
        setSummary(data.summary || null);
        // setActiveTab(1); // Switch to augmented data tab
      } else {
        console.error("Augmentation response missing expected fields:", data);
        setErrorAugmenting("Augmentation completed but response format is unexpected.");
      }
      
    } catch (error) {
      console.error("Error generating augmented dataset:", error);
      setErrorAugmenting(error.message || "An unknown error occurred during augmentation.");
    }
    setIsAugmenting(false);
  };
  
  const renderDataTableInternal = (data, isLoading, type) => {
    const displayData = Array.isArray(data) ? data : [];
    
    // Determine headers dynamically from the first item, assuming consistent structure
    let headers = [];
    if (displayData.length > 0) {
        headers = Object.keys(displayData[0]);
    } else if (type === "original" && previewData.length > 0) {
        headers = Object.keys(previewData[0]);
    } else if (type === "augmented" && augmentedDataPreview.length > 0) {
        headers = Object.keys(augmentedDataPreview[0]);
    }


    return (
      <TableContainer sx={{ maxHeight: 400, overflow: 'auto' }}>
         <Table size="small">
          <TableHead>
            <TableRow>
              {headers.map(header => <TableCell key={header}>{header.charAt(0).toUpperCase() + header.slice(1)}</TableCell>)}
              {headers.length === 0 && !isLoading && <TableCell>Data</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={headers.length || 1} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : displayData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={headers.length || 1} align="center">
                  No data available{type === "augmented" ? " for augmentation preview" : ""}.
                  {type === "augmented" && !augmentedDatasetGCSPath && !isAugmenting && " Generate augmented data to see a preview."}
                </TableCell>
              </TableRow>
            ) : (
              displayData.map((row, index) => (
                <TableRow key={index}>
                  {headers.map(header => <TableCell key={`${index}-${header}`}>{typeof row[header] === 'object' ? JSON.stringify(row[header]) : row[header]}</TableCell>)}
                  {headers.length === 0 && <TableCell>{typeof row === 'object' ? JSON.stringify(row) : row}</TableCell>}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // Auto-load original dataset preview when tab is changed to "Original Dataset"
    if (newValue === 0 && !loadingPreview && previewData.length === 0) {
      loadOriginalDatasetPreview();
    }
  };

  // Helper: is JSON file
  const isJsonFile = datasetFile && datasetFile.name && datasetFile.name.split('.').pop().toLowerCase() === 'json';

  // Only allow dataset choice if JSON file and augmentation exists, otherwise force to augmented
  useEffect(() => {
    if (!isJsonFile && augmentedDatasetGCSPath) {
      setDatasetChoice('augmented');
    }
  }, [isJsonFile, augmentedDatasetGCSPath]);

  // Notify parent of dataset choice change (for fine-tuning)
  useEffect(() => {
    if (onDatasetChoiceChange) {
      onDatasetChoiceChange(datasetChoice);
    }
  }, [datasetChoice, onDatasetChoiceChange]);

  // When augmentation completes, notify parent with the new file name
  useEffect(() => {
    if (augmentedDatasetGCSPath && datasetChoice === 'augmented' && onAugmentedDatasetReady) {
      // Extract just the filename from the GCS path
      const fileName = augmentedDatasetGCSPath.split('/').pop();
      onAugmentedDatasetReady(fileName);
    }
  }, [augmentedDatasetGCSPath, datasetChoice, onAugmentedDatasetReady]);

  // UI rendering
  return (
    <Paper elevation={3} sx={{ padding: 3, marginBottom: 2, backgroundColor: "#f9f9f9", borderRadius: "16px", boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.1)' }}>
      <Typography variant="h5" gutterBottom className="sessionName">
        Dataset Preview & Augmentation {datasetFile ? `(${datasetFile.name})` : ""}
      </Typography>

      {!dataset_path ? (
        <Typography variant="body1" align="center" sx={{ py: 3 }}>
          Please upload a dataset to see the preview and augmentation options.
        </Typography>
      ) : (
        <>
          <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: '4px' }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#6200ee' }}>
              Data Augmentation with Gemini
            </Typography>
            <TextField
              fullWidth
              label="Describe the fine-tuning task for the model"
              placeholder="e.g., A chatbot that answers questions about marine biology based on provided text."
              multiline
              rows={3}
              value={fineTuningTaskPrompt}
              onChange={(e) => setFineTuningTaskPrompt(e.target.value)}
              sx={{ mb: 2, mt: 1 }}
              disabled={isAugmenting}
              variant="outlined"
            />
            {/* Slider for QA pairs */}
            <Box sx={{ mb: 2 }}>
              <Typography gutterBottom>Number of QA pairs to generate: {qaPairsNbr}</Typography>
              <Slider
                value={qaPairsNbr}
                onChange={(_, v) => setQaPairsNbr(v)}
                step={100}
                min={100}
                max={500}
                marks={[{value:100,label:'100'},{value:200,label:'200'},{value:300,label:'300'},{value:400,label:'400'},{value:500,label:'500'}]}
                valueLabelDisplay="auto"
                disabled={isAugmenting}
              />
            </Box>
            <Button
              variant="contained"
              onClick={handleGenerateAugmentedDataset}
              disabled={isAugmenting || !dataset_path || !fineTuningTaskPrompt.trim()}
              sx={{
                backgroundColor: "#6200ee",
                "&:hover": { backgroundColor: "#3700b3" },
                "&:disabled": { backgroundColor: "#e0e0e0" },
                mb: 1,
                mr: 1,
              }}
            >
              {isAugmenting ? <CircularProgress size={24} sx={{ color: "white"}} /> : "Generate Augmented Dataset"}
            </Button>
            {errorAugmenting && (
              <Alert severity="error" sx={{ mt: 2 }}>{errorAugmenting}</Alert>
            )}
            {augmentedDatasetGCSPath && !errorAugmenting && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Augmented dataset generated! Path: <strong>{augmentedDatasetGCSPath}</strong>
                {totalAugmentedEntries > 0 && ` (Previewing ${augmentedDataPreview.length} of ${totalAugmentedEntries} entries)`}
              </Alert>
            )}
          </Box>
          {/* Only show dataset choice if JSON file and augmentation exists */}
          {isJsonFile && augmentedDatasetGCSPath && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Choose which dataset to use for fine-tuning:</Typography>
              <RadioGroup
                row
                value={datasetChoice}
                onChange={e => setDatasetChoice(e.target.value)}
              >
                <FormControlLabel value="original" control={<Radio />} label="Original Dataset" />
                <FormControlLabel value="augmented" control={<Radio />} label="Augmented Dataset" />
              </RadioGroup>
            </Box>
          )}
          {/* If not JSON, only show the augmented option as a radio button, disabled original */}
          {!isJsonFile && augmentedDatasetGCSPath && (
            <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Choose which dataset to use for fine-tuning:</Typography>
              <RadioGroup row value="augmented">
                <FormControlLabel value="original" control={<Radio disabled />} label="Original Dataset" />
                <FormControlLabel value="augmented" control={<Radio checked readOnly />} label="Augmented Dataset" />
              </RadioGroup>
            </Box>
          )}
          <Box sx={{ width: '100%' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
            >
              <Tab label="Original Dataset" />
              <Tab label="Augmented Dataset Preview" disabled={!augmentedDatasetGCSPath && augmentedDataPreview.length === 0} />
            </Tabs>
            <Box sx={{ mt: 2 }}>
              {activeTab === 0 && (
                <>
                  <Typography variant="subtitle1" gutterBottom>
                    Original Dataset Preview (First {previewData.length} of {totalEntries} entries)
                  </Typography>
                  {totalEntries > previewData.length && previewData.length > 0 && (
                    <Alert severity="info" sx={{ mb: 1 }}>
                      Showing the first {previewData.length} entries of {totalEntries} total.
                    </Alert>
                  )}
                  <TableContainer sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    {renderDataTableInternal(previewData, loadingPreview, 'original')}
                  </TableContainer>
                </>
              )}
              {activeTab === 1 && (
                <>
                  {summary && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <strong>Summary:</strong> {summary}
                    </Alert>
                  )}
                  <Typography variant="subtitle1" gutterBottom>
                    Augmented Dataset Preview {augmentedDatasetGCSPath && `(from ${augmentedDatasetGCSPath})`}
                  </Typography>
                  <TableContainer sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    {renderDataTableInternal(augmentedDataPreview, isAugmenting, 'augmented')}
                  </TableContainer>
                </>
              )}
            </Box>
          </Box>
          {/* Additional info or alerts can be added here if needed */}
        </>
      )}
    </Paper>
  );
};

export default DatasetPreview;