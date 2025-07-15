import React, { useState } from "react";
import { 
  Button, 
  Box, 
  Typography, 
  Paper, 
  CircularProgress,
  Link,
  Chip,
  Alert, // Added Alert
  AlertTitle // Added AlertTitle
} from "@mui/material";
import { styled } from "@mui/material/styles";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DataObjectIcon from "@mui/icons-material/DataObject";
import TableChartIcon from "@mui/icons-material/TableChart";
import "../style/assets.css";
import "../style/modern.css";

// Styled component for the file input
const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

const UploadDataset = ({ datasetFile, trainableDatasetName, onFileChange, uploadStatus, onUpload }) => {
  const [loading, setLoading] = useState(false);
  
  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file && onFileChange) {
      onFileChange(file);
    }
  };
  
  // Determine file type icon
  const getFileTypeIcon = (fileName) => {
    if (!fileName) return null;
    
    const extension = fileName.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <PictureAsPdfIcon sx={{ color: "#f44336" }} />;
      case 'json':
        return <DataObjectIcon sx={{ color: "#2196f3" }} />;
      case 'csv':
        return <TableChartIcon sx={{ color: "#4caf50" }} />;
      default:
        return null;
    }
  };

  const handleUpload = async () => {
    setLoading(true);
    await onUpload();
    setLoading(false);
  };

  const displayFileName = datasetFile?.name || (trainableDatasetName ? trainableDatasetName.split('/').pop() : null);
  const displayFileSize = datasetFile?.size;

  return (
    <div>
      <div className="modern-card-header">
        <Typography className="modern-card-title">Upload Dataset</Typography>
        <Typography className="modern-card-subtitle">
          Upload your training data in JSON, CSV, PDF, PPT, DOCX, HTML, or TXT format
        </Typography>
      </div>
      
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
        <label 
          className="modern-btn modern-btn-primary"
          style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
        >
          <CloudUploadIcon sx={{ fontSize: 16, mr: 1 }} />
          Select File
          <VisuallyHiddenInput type="file" onChange={handleFileSelect} />
        </label>
        
        {displayFileName && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip 
              icon={getFileTypeIcon(displayFileName)} 
              label={displayFileName}
              variant="outlined" 
            />
            {displayFileSize && (
              <Typography variant="caption">
                {`(${(displayFileSize / 1024).toFixed(2)} KB)`}
              </Typography>
            )}
          </Box>
        )}

        <button
          className={`modern-btn modern-btn-primary ${loading ? 'modern-btn-loading' : ''}`}
          onClick={handleUpload}
          disabled={!datasetFile || loading}
        >
          {loading ? (
            <>
              <CircularProgress size={16} color="inherit" sx={{ marginRight: 1 }} />
              Uploading...
            </>
          ) : (
            "Upload Dataset"
          )}
        </button>
        
        {uploadStatus && (
          <div className={`modern-alert ${uploadStatus.toLowerCase().includes("error") ? "modern-alert-error" : "modern-alert-success"}`} style={{ width: "100%" }}>
            <div style={{ fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
              {uploadStatus.toLowerCase().includes("error") ? "Error" : "Success"}
            </div>
            {uploadStatus}
          </div>
        )}
      </Box>
    </div>
  );
};

export default UploadDataset;
