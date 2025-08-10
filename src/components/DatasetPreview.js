import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
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
  Card,
  CardContent,
  Chip,
  Paper,
} from "@mui/material";
import { ChatBubbleOutline, SmartToy, Person } from "@mui/icons-material";
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
  const [augmentedPreviewError, setAugmentedPreviewError] = useState(null);

  // Helper: is JSON file (fall back to dataset_path on refresh when datasetFile is null)
  const isJsonFile = (() => {
    const name = (datasetFile?.name || dataset_path || '').toLowerCase();
    return name.endsWith('.json');
  })();

  // Define functions first before they're used in useEffect
  const loadOriginalDatasetPreview = useCallback(async () => {
    if (!dataset_path || dataset_path === 'undefined' || dataset_path === 'null') return;

    // Only preview if file is JSON
    const isJson = dataset_path.toLowerCase().endsWith('.json');
    if (!isJson) {
      setPreviewData([]);
      setTotalEntries(0);
      setLoadingPreview(false);
      return;
    }

    setLoadingPreview(true);
    try {
      const response = await fetch(`${API_BASE_URL}/dataset/preview?path=${encodeURIComponent(dataset_path)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.preview && data.full_count !== undefined) {
          setPreviewData(data.preview);
          setTotalEntries(data.full_count);
        } else if (Array.isArray(data)) {
          setPreviewData(data);
          setTotalEntries(data.length);
        } else {
          setPreviewData([]);
          setTotalEntries(0);
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
  }, [dataset_path]); // No dependencies to prevent re-renders

  const loadAugmentedDatasetPreview = useCallback(async (augmentedDatasetPath) => {
    if (!augmentedDatasetPath || augmentedDatasetPath === 'undefined' || augmentedDatasetPath === 'null') return;

    // Normalize GCS object path: remove bucket prefix and ensure augmented/ prefix when missing
    const normalizeGcsObjectPath = (p) => {
      if (!p) return p;
      let s = String(p).trim();
      try { s = decodeURIComponent(s); } catch {}
      // Strip gs://<bucket>/ prefix
      if (s.startsWith('gs://')) {
        const withoutScheme = s.slice('gs://'.length);
        const parts = withoutScheme.split('/');
        // drop bucket segment
        s = parts.slice(1).join('/');
      }
      // Strip explicit bucket name if provided
      const bucketPrefix = 'llm-garage-datasets/';
      if (s.startsWith(bucketPrefix)) {
        s = s.slice(bucketPrefix.length);
      }
      // If no folder prefix, default to augmented/
      if (!s.includes('/')) {
        s = `augmented/${s}`;
      }
      return s;
    };

    const normalizedPath = normalizeGcsObjectPath(augmentedDatasetPath);

    // Ensure tab becomes enabled even if fetch fails
    setAugmentedDatasetGCSPath(prev => prev || normalizedPath);
    setAugmentedPreviewError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/dataset/preview?path=${encodeURIComponent(normalizedPath)}`);
      if (response.ok) {
        const data = await response.json();
        
        // Handle different data structures
        let previewData = [];
        let fullCount = 0;
        let summaryText = null;
        if (data.summary && data.qa_pairs) {
          summaryText = data.summary;
          if (typeof data.qa_pairs === 'string') {
            try {
              const parsedQAPairs = JSON.parse(data.qa_pairs);
              if (Array.isArray(parsedQAPairs)) {
                previewData = parsedQAPairs;
                fullCount = parsedQAPairs.length;
              }
            } catch (e) {
              console.error("Failed to parse qa_pairs string:", e);
            }
          } else if (Array.isArray(data.qa_pairs)) {
            previewData = data.qa_pairs;
            fullCount = data.qa_pairs.length;
          }
        } else if (data.preview && data.full_count !== undefined) {
          previewData = data.preview;
          fullCount = data.full_count;
          if (previewData.length === 1 && previewData[0].summary && previewData[0].qa_pairs) {
            const singleItem = previewData[0];
            summaryText = singleItem.summary;
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
        } else if (data.qa_pairs && Array.isArray(data.qa_pairs)) {
          previewData = data.qa_pairs;
          fullCount = data.qa_pairs.length;
          summaryText = data.summary || null;
        } else if (Array.isArray(data)) {
          previewData = data;
          fullCount = data.length;
        }

        setAugmentedDataPreview(previewData);
        setTotalAugmentedEntries(fullCount);
        setSummary(summaryText);
        setAugmentedDatasetGCSPath(normalizedPath);
        setAugmentedPreviewError(null);
      } else {
        const errorText = await response.text().catch(() => `HTTP ${response.status}`);
        console.error("Error loading augmented dataset preview: Server returned", response.status, errorText);
        setAugmentedPreviewError(`Failed to load augmented preview (${response.status}).`);
      }
    } catch (error) {
      console.error("Error loading augmented dataset preview:", error);
      setAugmentedPreviewError("Failed to load augmented preview.");
    }
  }, []); // No dependencies to prevent re-renders

  // useEffect hooks - simplified to prevent re-render loops
  useEffect(() => {
    if (dataset_path && dataset_path !== 'undefined' && dataset_path !== 'null') {
      loadOriginalDatasetPreview();
    }
  }, [dataset_path]); // Only depend on dataset_path

  useEffect(() => {
    if (augmentedDatasetFileName && augmentedDatasetFileName !== 'undefined' && augmentedDatasetFileName !== 'null') {
      loadAugmentedDatasetPreview(augmentedDatasetFileName);
    }
  }, [augmentedDatasetFileName]); // Only depend on augmentedDatasetFileName

  useEffect(() => {
    if (selectedDatasetChoice && selectedDatasetChoice !== datasetChoice) {
      setDatasetChoice(selectedDatasetChoice);
      setActiveTab(selectedDatasetChoice === 'augmented' ? 1 : 0);
    }
  }, [selectedDatasetChoice]); // Only depend on selectedDatasetChoice - removed internal state dependencies

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
        setSummary(data.summary || null);
        setAugmentedPreviewError(null); // clear any stale preview error since we have data
        
        // Notify parent
        if (onAugmentedDatasetReady) {
          onAugmentedDatasetReady(data.augmented_dataset_gcs_path);
        }
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
  
  // New function to render conversation view for JSON augmented data
  const renderConversationView = useCallback((data, isLoading) => {
    // If data is a JSON string, try to parse it
    let source = data;
    if (typeof source === 'string') {
      try {
        source = JSON.parse(source);
      } catch (e) {
        // ignore parse error; will fallback gracefully
      }
    }

    let displayData = Array.isArray(source) ? source : [];
    
    // Handle special case where data might be an object with qa_pairs
    if (!Array.isArray(source) && source && typeof source === 'object') {
      if (source.qa_pairs && Array.isArray(source.qa_pairs)) {
        displayData = source.qa_pairs;
      } else if (source.preview && Array.isArray(source.preview)) {
        displayData = source.preview;
      } else {
        displayData = [source];
      }
    }

    // Parse conversation data from text field
    const parseConversationFromText = (text) => {
      if (!text) return [];
      
      const conversations = [];
      const turns = text.split(/<start_of_turn>/);
      
      for (let i = 1; i < turns.length; i++) {
        const turn = turns[i];
        if (turn.includes('user\n')) {
          const userContent = turn.split('user\n')[1]?.split('<end_of_turn>')[0]?.trim();
          if (userContent) {
            conversations.push({
              role: 'user',
              content: userContent
            });
          }
        } else if (turn.includes('model\n')) {
          const modelContent = turn.split('model\n')[1]?.split('<end_of_turn>')[0]?.trim();
          if (modelContent) {
            conversations.push({
              role: 'model',
              content: modelContent
            });
          }
        }
      }
      
      return conversations;
    };

    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (displayData.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No conversation data available for augmentation preview. Generate augmented data to see a preview.
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ maxHeight: 500, overflow: 'auto', p: 2 }}>
        {displayData.map((item, index) => {
          const text = typeof item === 'string' ? item : ((item && typeof item === 'object') ? (item.text || '') : '');
          const conversations = parseConversationFromText(text);
          
          if (conversations.length === 0) {
            return (
              <Card key={index} sx={{ mb: 2, backgroundColor: '#f5f5f5' }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    No valid conversation found in item {index + 1}
                  </Typography>
                </CardContent>
              </Card>
            );
          }

          return (
            <Paper 
              key={index} 
              elevation={2} 
              sx={{ 
                mb: 3, 
                p: 2, 
                backgroundColor: '#fafafa',
                border: '1px solid #e0e0e0',
                borderRadius: 2
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ChatBubbleOutline sx={{ mr: 1, color: '#1976d2' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Conversation {index + 1}
                </Typography>
              </Box>
              
              {conversations.map((turn, turnIndex) => (
                <Box 
                  key={turnIndex}
                  sx={{ 
                    display: 'flex', 
                    mb: 1.5,
                    alignItems: 'flex-start'
                  }}
                >
                  {turn.role === 'user' ? (
                    <>
                      <Chip 
                        icon={<Person />}
                        label="User"
                        size="small"
                        sx={{ 
                          mr: 2, 
                          backgroundColor: '#e3f2fd',
                          color: '#1976d2',
                          fontWeight: 600,
                          minWidth: 80
                        }}
                      />
                      <Card 
                        sx={{ 
                          flex: 1, 
                          backgroundColor: '#e3f2fd',
                          boxShadow: 1
                        }}
                      >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {turn.content}
                          </Typography>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <>
                      <Chip 
                        icon={<SmartToy />}
                        label="Model"
                        size="small"
                        sx={{ 
                          mr: 2, 
                          backgroundColor: '#f3e5f5',
                          color: '#7b1fa2',
                          fontWeight: 600,
                          minWidth: 80
                        }}
                      />
                      <Card 
                        sx={{ 
                          flex: 1, 
                          backgroundColor: '#f3e5f5',
                          boxShadow: 1
                        }}
                      >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {turn.content}
                          </Typography>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </Box>
              ))}
            </Paper>
          );
        })}
      </Box>
    );
  }, []);
  
  // Chat view for simple QA pairs (question -> user, answer -> model)
  const renderQAPairsChatView = useCallback((data, isLoading) => {
    // Flatten common wrappers
    let displayData = Array.isArray(data) ? data : [];
    if (!Array.isArray(data) && data && typeof data === 'object') {
      if (Array.isArray(data.qa_pairs)) displayData = data.qa_pairs;
      else if (Array.isArray(data.preview)) displayData = data.preview;
      else displayData = [data];
    }

    const getQA = (item) => {
      if (!item || typeof item !== 'object') return { q: '', a: '' };
      const q = item.question ?? item.prompt ?? '';
      const a = item.answer ?? item.completion ?? '';
      return { q, a };
    };

    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (!displayData || displayData.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No QA data available for augmentation preview. Generate augmented data to see a preview.
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ maxHeight: 500, overflow: 'auto', p: 2 }}>
        {displayData.map((item, index) => {
          const { q, a } = getQA(item);
          if (!q && !a) {
            return (
              <Card key={index} sx={{ mb: 2, backgroundColor: '#f5f5f5' }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    No valid QA pair found in item {index + 1}
                  </Typography>
                </CardContent>
              </Card>
            );
          }

          return (
            <Paper 
              key={index}
              elevation={2}
              sx={{ mb: 3, p: 2, backgroundColor: '#fafafa', border: '1px solid #e0e0e0', borderRadius: 2 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ChatBubbleOutline sx={{ mr: 1, color: '#1976d2' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  QA Pair {index + 1}
                </Typography>
              </Box>

              {q && (
                <Box sx={{ display: 'flex', mb: 1.5, alignItems: 'flex-start' }}>
                  <Chip 
                    icon={<Person />}
                    label="User"
                    size="small"
                    sx={{ mr: 2, backgroundColor: '#e3f2fd', color: '#1976d2', fontWeight: 600, minWidth: 80 }}
                  />
                  <Card sx={{ flex: 1, backgroundColor: '#e3f2fd', boxShadow: 1 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {q}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              )}

              {a && (
                <Box sx={{ display: 'flex', mb: 1.5, alignItems: 'flex-start' }}>
                  <Chip 
                    icon={<SmartToy />}
                    label="Model"
                    size="small"
                    sx={{ mr: 2, backgroundColor: '#f3e5f5', color: '#7b1fa2', fontWeight: 600, minWidth: 80 }}
                  />
                  <Card sx={{ flex: 1, backgroundColor: '#f3e5f5', boxShadow: 1 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {a}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              )}
            </Paper>
          );
        })}
      </Box>
    );
  }, []);

  const renderDataTableInternal = useCallback((data, isLoading, type) => {
    // For augmented data, use chat views when applicable
    if (type === "augmented") {
      // If data is a JSON string, try to parse it
      let source = data;
      if (typeof source === 'string') {
        try { source = JSON.parse(source); } catch { /* noop */ }
      }

      let displayData = Array.isArray(source) ? source : [];
      if (!Array.isArray(source) && source && typeof source === 'object') {
        if (Array.isArray(source.qa_pairs)) displayData = source.qa_pairs;
        else if (Array.isArray(source.preview)) displayData = source.preview;
        else displayData = [source];
      }

      // Gemma conversation format
      const hasGemmaFormat = displayData.some(item => {
        const itemText = typeof item === 'string' ? item : (item && item.text);
        return (
          typeof itemText === 'string' &&
          itemText.includes('<start_of_turn>user') &&
          itemText.includes('<start_of_turn>model')
        );
      });
      if (hasGemmaFormat) return renderConversationView(source, isLoading);

      // Simple QA pairs format
      const looksLikeQAPairs = displayData.length > 0 && displayData.every(it => {
        if (!it || typeof it !== 'object') return false;
        const hasQ = ('question' in it) || ('prompt' in it);
        const hasA = ('answer' in it) || ('completion' in it);
        return hasQ && hasA;
      });
      if (looksLikeQAPairs) return renderQAPairsChatView(displayData, isLoading);
    }
    
    // For non-JSON files or data without Gemma format, use the original table view
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
      <TableContainer sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 1 }}>
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
  }, [renderConversationView, renderQAPairsChatView]); // Add renderConversationView and renderQAPairsChatView back to dependencies
  
  // Memoized table renderings to prevent unnecessary re-renders
  const originalDataTable = useMemo(() => 
    renderDataTableInternal(previewData, loadingPreview, 'original'), 
    [renderDataTableInternal, previewData, loadingPreview]
  );

  const augmentedDataTable = useMemo(() => 
    renderDataTableInternal(augmentedDataPreview, isAugmenting, 'augmented'), 
    [renderDataTableInternal, augmentedDataPreview, isAugmenting]
  );

  // Simple handlers for parent communication - no useEffect needed
  const handleDatasetChoiceChange = (newChoice) => {
    setDatasetChoice(newChoice);
    if (onDatasetChoiceChange) {
      onDatasetChoiceChange(newChoice);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // Auto-load original dataset preview when tab is changed to "Original Dataset"
    if (newValue === 0 && !loadingPreview && previewData.length === 0) {
      loadOriginalDatasetPreview();
    }
  };

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
                onChange={e => handleDatasetChoiceChange(e.target.value)}
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
                    {loadingPreview ? (
                      <CircularProgress size={24} />
                    ) : previewData.length === 0 ? (
                      dataset_path && !dataset_path.toLowerCase().endsWith('.json') ? (
                        <Alert severity="info">No preview available for this file type.</Alert>
                      ) : (
                        <Alert severity="info">No preview available.</Alert>
                      )
                    ) : (
                      originalDataTable
                    )}
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
                  {augmentedPreviewError && augmentedDataPreview.length === 0 && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {augmentedPreviewError}
                    </Alert>
                  )}
                  <Typography variant="subtitle1" gutterBottom>
                    Augmented Dataset Preview {augmentedDatasetGCSPath && `(from ${augmentedDatasetGCSPath})`}
                  </Typography>
                  {augmentedDataTable}
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