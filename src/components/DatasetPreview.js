import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import "../style/modern.css";

const DatasetPreview = ({ datasetFile, dataset_path, onDatasetChoiceChange, selectedDatasetChoice, onAugmentedDatasetReady, augmentedDatasetFileName }) => {
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
      // Only reset augmentation states if original dataset changes and no saved augmented dataset
      if (!augmentedDatasetFileName) {
        setAugmentedDataPreview([]);
        setAugmentedDatasetGCSPath(null);
        onAugmentedDatasetReady(null); // Notify parent
        setErrorAugmenting(null);
        setFineTuningTaskPrompt("");
        setTotalAugmentedEntries(0);
      }
    }
  }, [dataset_path]);

  // New effect to load augmented dataset when augmentedDatasetFileName prop is provided
  useEffect(() => {
    console.log("[DatasetPreview] augmentedDatasetFileName prop changed:", augmentedDatasetFileName);
    if (augmentedDatasetFileName) {
      loadAugmentedDatasetPreview(augmentedDatasetFileName);
    }
  }, [augmentedDatasetFileName]);

  // Sync the selectedDatasetChoice prop with internal state
  useEffect(() => {
    console.log("[DatasetPreview] selectedDatasetChoice prop changed:", selectedDatasetChoice);
    if (selectedDatasetChoice) {
      setDatasetChoice(selectedDatasetChoice);
      // Also set the active tab based on the dataset choice
      if (selectedDatasetChoice === 'augmented') {
        setActiveTab(1);
      } else {
        setActiveTab(0);
      }
    }
  }, [selectedDatasetChoice]);

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

  const loadAugmentedDatasetPreview = async (augmentedDatasetPath) => {
    if (!augmentedDatasetPath || augmentedDatasetPath === 'undefined' || augmentedDatasetPath === 'null') return;
    
    console.log("[DatasetPreview] Loading augmented dataset preview from:", augmentedDatasetPath);
    try {
      const response = await fetch(`${API_BASE_URL}/dataset/preview?path=${encodeURIComponent(augmentedDatasetPath)}`);
      console.log("[DatasetPreview] Augmented dataset response status:", response.status);
      if (response.ok) {
        const data = await response.json();
        console.log("[DatasetPreview] Augmented dataset response data:", data);
        
        // Handle different data structures
        let previewData = [];
        let fullCount = 0;
        let summaryText = null;
        
        // Priority 1: Canonical structure - root level summary and qa_pairs
        if (data.summary && data.qa_pairs) {
          console.log("[DatasetPreview] Detected canonical structure with summary and qa_pairs at root");
          summaryText = data.summary;
          
          if (typeof data.qa_pairs === 'string') {
            // qa_pairs is a JSON string, parse it
            try {
              const parsedQAPairs = JSON.parse(data.qa_pairs);
              if (Array.isArray(parsedQAPairs)) {
                previewData = parsedQAPairs;
                fullCount = parsedQAPairs.length;
              } else {
                console.warn("Parsed qa_pairs is not an array:", parsedQAPairs);
                previewData = [];
                fullCount = 0;
              }
            } catch (e) {
              console.error("Failed to parse qa_pairs string:", e);
              previewData = [];
              fullCount = 0;
            }
          } else if (Array.isArray(data.qa_pairs)) {
            previewData = data.qa_pairs;
            fullCount = data.qa_pairs.length;
          } else {
            console.warn("qa_pairs is neither string nor array:", typeof data.qa_pairs);
            previewData = [];
            fullCount = 0;
          }
        }
        // Priority 2: Standard preview format (backend wraps data)
        else if (data.preview && data.full_count !== undefined) {
          console.log("[DatasetPreview] Detected standard preview format");
          previewData = data.preview;
          fullCount = data.full_count;
          
          // Check if the preview data contains a single object with summary and qa_pairs
          if (previewData.length === 1 && previewData[0].summary && previewData[0].qa_pairs) {
            const singleItem = previewData[0];
            summaryText = singleItem.summary;
            // Parse qa_pairs if it's a string
            if (typeof singleItem.qa_pairs === 'string') {
              try {
                const parsedQAPairs = JSON.parse(singleItem.qa_pairs);
                if (Array.isArray(parsedQAPairs)) {
                  previewData = parsedQAPairs;
                  fullCount = parsedQAPairs.length;
                }
              } catch (e) {
                console.error("Failed to parse qa_pairs string:", e);
              }
            } else if (Array.isArray(singleItem.qa_pairs)) {
              previewData = singleItem.qa_pairs;
              fullCount = singleItem.qa_pairs.length;
            }
          }
        }
        // Priority 3: Direct qa_pairs array with optional summary
        else if (data.qa_pairs && Array.isArray(data.qa_pairs)) {
          console.log("[DatasetPreview] Detected direct qa_pairs array format");
          previewData = data.qa_pairs;
          fullCount = data.qa_pairs.length;
          summaryText = data.summary || null;
        }
        // Priority 4: Direct array format (fallback)
        else if (Array.isArray(data)) {
          console.log("[DatasetPreview] Detected direct array format");
          previewData = data;
          fullCount = data.length;
        }
        // Priority 5: Unknown format
        else {
          console.warn("Unexpected preview data format for augmented dataset:", data);
          previewData = [];
          fullCount = 0;
        }
        
        setAugmentedDataPreview(previewData);
        setTotalAugmentedEntries(fullCount);
        setSummary(summaryText);
        console.log("[DatasetPreview] Set augmented preview with", previewData.length, "items, summary:", summaryText);
        
        // Set the GCS path (don't call onAugmentedDatasetReady as it's already set in parent)
        setAugmentedDatasetGCSPath(augmentedDatasetPath);
        
        // Switch to augmented tab if we have data and choice is augmented
        if (previewData.length > 0 && selectedDatasetChoice === 'augmented') {
          console.log("[DatasetPreview] Switching to augmented tab");
          setActiveTab(1);
        }
      } else {
        console.error("Error loading augmented dataset preview: Server returned", response.status);
        setAugmentedDataPreview([]);
        setTotalAugmentedEntries(0);
      }
    } catch (error) {
      console.error("Error loading augmented dataset preview:", error);
      setAugmentedDataPreview([]);
      setTotalAugmentedEntries(0);
    }
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
  
  const renderDataTableInternal = useCallback((data, isLoading, type) => {
    let displayData = Array.isArray(data) ? data : [];
    
    // Handle special case where data might be an object with qa_pairs
    if (!Array.isArray(data) && data && typeof data === 'object') {
      if (data.qa_pairs && Array.isArray(data.qa_pairs)) {
        displayData = data.qa_pairs;
      } else if (data.preview && Array.isArray(data.preview)) {
        displayData = data.preview;
      } else {
        displayData = [data];
      }
    }
    
    // Determine headers and data format
    let headers = [];
    let processedData = displayData;

    if (type === "augmented") {
      // For augmented data, always use question/answer columns
      headers = ["question", "answer"];
      
      if (displayData.length > 0) {
        const firstRow = displayData[0];
        if (firstRow.question && firstRow.answer) {
          // QA pair format - ensure we only include question/answer fields
          processedData = displayData.map(row => ({
            question: row.question || "",
            answer: row.answer || ""
          }));
        } else if (firstRow.text) {
          // Gemma format with text field - extract question/answer from text
          processedData = displayData.map(row => {
            const text = row.text || "";
            const userMatch = text.match(/<start_of_turn>user\n(.*?)<end_of_turn>/s);
            const modelMatch = text.match(/<start_of_turn>model\n(.*?)<end_of_turn>/s);
            return {
              question: userMatch ? userMatch[1].trim() : "No question found",
              answer: modelMatch ? modelMatch[1].trim() : "No answer found"
            };
          });
        } else {
          // Fallback - force question/answer structure for augmented data
          processedData = displayData.map((row, index) => ({
            question: `Question ${index + 1}`,
            answer: typeof row === 'object' ? JSON.stringify(row) : String(row || '')
          }));
        }
      } else {
        processedData = [];
      }
    } else {
      // For original data, use dynamic headers
      if (displayData.length > 0) {
        headers = Object.keys(displayData[0]);
      } else if (type === "original" && previewData.length > 0) {
        headers = Object.keys(previewData[0]);
      }
      processedData = displayData;
    }

    const renderCellValue = (row, header) => {
      const value = row[header];
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return String(value || '');
    };

    return (
      <TableContainer sx={{ maxHeight: 400, overflow: 'auto' }}>
         <Table size="small">
          <TableHead>
            <TableRow>
              {headers.map(header => (
                <TableCell key={header}>
                  {header.charAt(0).toUpperCase() + header.slice(1)}
                </TableCell>
              ))}
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
            ) : processedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={headers.length || 1} align="center">
                  No data available{type === "augmented" ? " for augmentation preview" : ""}.
                  {type === "augmented" && !augmentedDatasetGCSPath && !isAugmenting && " Generate augmented data to see a preview."}
                </TableCell>
              </TableRow>
            ) : (
              processedData.map((row, index) => (
                <TableRow key={`${type}-${index}`}>
                  {headers.map(header => (
                    <TableCell 
                      key={`${type}-${index}-${header}`} 
                      sx={{ 
                        maxWidth: 300, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {renderCellValue(row, header)}
                    </TableCell>
                  ))}
                  {headers.length === 0 && (
                    <TableCell>
                      {typeof row === 'object' ? JSON.stringify(row) : String(row || '')}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }, [previewData, augmentedDatasetGCSPath, isAugmenting]); // Dependencies for useCallback

  // Memoized table renderings to prevent unnecessary re-renders
  const originalDataTable = useMemo(() => 
    renderDataTableInternal(previewData, loadingPreview, 'original'), 
    [renderDataTableInternal, previewData, loadingPreview]
  );

  const augmentedDataTable = useMemo(() => 
    renderDataTableInternal(augmentedDataPreview, isAugmenting, 'augmented'), 
    [renderDataTableInternal, augmentedDataPreview, isAugmenting]
  );

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
    <div>
      <div className="modern-card-header">
        <Typography className="modern-card-title">
          Dataset Preview & Augmentation {datasetFile ? `(${datasetFile.name})` : ""}
        </Typography>
        <Typography className="modern-card-subtitle">
          Preview your dataset and optionally create an augmented version for better training
        </Typography>
      </div>

      {!dataset_path ? (
        <Typography variant="body1" align="center" sx={{ py: 3 }}>
          Please upload a dataset to see the preview and augmentation options.
        </Typography>
      ) : (
        <>
          <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: '4px' }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'var(--primary-color)' }}>
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
                backgroundColor: "var(--primary-color)",
                "&:hover": { backgroundColor: "var(--primary-hover)" },
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
                    {originalDataTable}
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
                    {augmentedDataTable}
                  </TableContainer>
                </>
              )}
            </Box>
          </Box>
          {/* Additional info or alerts can be added here if needed */}
        </>
      )}
    </div>
  );
};

export default DatasetPreview;