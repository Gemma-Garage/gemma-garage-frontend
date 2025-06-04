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
  Tabs,
  Tab,
  Alert,
  TextField, // Added TextField
} from "@mui/material";
import { API_BASE_URL } from "../api";

const DatasetPreview = ({ datasetFile, dataset_path }) => {
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


  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (dataset_path) {
      loadOriginalDatasetPreview();
      // Reset augmentation states if original dataset changes
      setAugmentedDataPreview([]);
      setAugmentedDatasetGCSPath(null);
      setErrorAugmenting(null);
      setFineTuningTaskPrompt("");
      setTotalAugmentedEntries(0);
    }
  }, [dataset_path]);

  const loadOriginalDatasetPreview = async () => {
    if (!dataset_path) return;
    
    setLoadingPreview(true);
    try {
      const response = await fetch(`${API_BASE_URL}/dataset/preview?path=${encodeURIComponent(dataset_path)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.preview && data.full_count !== undefined) {
          setPreviewData(data.preview);
          setTotalEntries(data.full_count);
        } else if (Array.isArray(data)) { // Fallback for older endpoint version
          setPreviewData(data.slice(0, 5)); 
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

    try {
      const response = await fetch(`${API_BASE_URL}/dataset/augment-gemma`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dataset_gcs_path: dataset_path,
          fine_tuning_task_prompt: fineTuningTaskPrompt,
          // model_choice: "gemini-1.5-flash", // Can be added later if needed
          // num_examples_to_generate: 50, // Can be added later
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Error augmenting dataset. Server response not JSON." }));
        throw new Error(errorData.detail || `Error augmenting dataset. Status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.preview_augmented_data && data.augmented_dataset_gcs_path) {
        setAugmentedDataPreview(data.preview_augmented_data.preview || []);
        setTotalAugmentedEntries(data.preview_augmented_data.full_count || (data.preview_augmented_data.preview || []).length);
        setAugmentedDatasetGCSPath(data.augmented_dataset_gcs_path);
        setActiveTab(1); // Switch to augmented data tab
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
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
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
      <TableContainer>
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

  return (
    <Paper elevation={3} sx={{ padding: 3, marginBottom: 2, backgroundColor: "#f9f9f9" }}>
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
              Data Augmentation with Gemma
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
            <Button
              variant="contained"
              onClick={handleGenerateAugmentedDataset}
              disabled={isAugmenting || !dataset_path || !fineTuningTaskPrompt.trim()}
              sx={{
                backgroundColor: "#6200ee",
                "&:hover": { backgroundColor: "#3700b3" },
                "&:disabled": { backgroundColor: "#e0e0e0" },
                mb: 1, // Adjusted margin
                mr: 1, // Added margin for spacing if other buttons are added
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
          
          <Box sx={{ width: '100%' }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
            >
              <Tab label="Original Dataset" />
              <Tab 
                label="Augmented Dataset Preview" 
                disabled={!augmentedDatasetGCSPath && augmentedDataPreview.length === 0}
              />
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
                  {renderDataTableInternal(previewData, loadingPreview, "original")}
                </>
              )}
              {activeTab === 1 && (
                <>
                  <Typography variant="subtitle1" gutterBottom>
                    Augmented Dataset Preview 
                    {augmentedDatasetGCSPath && ` (from ${augmentedDatasetGCSPath})`}
                    {totalAugmentedEntries > 0 && ` - Showing first ${augmentedDataPreview.length} of ${totalAugmentedEntries} generated entries`}
                  </Typography>
                  {/* This alert is now part of the success message above or covered by other conditions */}
                  {/* {totalAugmentedEntries > augmentedDataPreview.length && augmentedDataPreview.length > 0 && (
                     <Alert severity=\"info\" sx={{ mb: 1 }}>
                      Showing the first {augmentedDataPreview.length} entries of {totalAugmentedEntries} total generated.
                    </Alert>
                  )} */}
                  {renderDataTableInternal(augmentedDataPreview, isAugmenting, "augmented")}
                  {!isAugmenting && augmentedDataPreview.length === 0 && augmentedDatasetGCSPath && !errorAugmenting && (
                    <Alert severity="warning" sx={{mt: 1}}>Preview data is empty, but an augmented dataset path exists. The generated dataset might be empty or generation resulted in no valid examples for preview.</Alert>
                  )}
                   {!isAugmenting && augmentedDataPreview.length === 0 && !augmentedDatasetGCSPath && !errorAugmenting && (
                    <Alert severity="info" sx={{mt: 1}}>No augmented data generated or previewed yet. Use the 'Generate Augmented Dataset' feature above.</Alert>
                  )}
                </>
              )}
            </Box>
          </Box>
        </>
      )}
    </Paper>
  );
};

export default DatasetPreview;