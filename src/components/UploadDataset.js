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

const UploadDataset = ({ datasetFile, onFileChange, uploadStatus, onUpload }) => {
  const [loading, setLoading] = useState(false);
  
  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file && onFileChange) {
      onFileChange(file);
    }
  };
  
  // Determine file type icon
  const getFileTypeIcon = () => {
    if (!datasetFile || !datasetFile.name) return null;
    
    const extension = datasetFile.name.split('.').pop().toLowerCase();
    
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

  return (
    <Paper elevation={3} sx={{ padding: 3, marginBottom: 2, backgroundColor: "#f9f9f9", borderRadius: "16px", boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.1)' }}>
      <Typography variant="h5" gutterBottom className="sessionName">
        Upload Dataset
      </Typography>
      
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
        <Button
          component="label"
          variant="contained"
          startIcon={<CloudUploadIcon />}
          sx={{ 
            backgroundColor: "#6200ee", 
            "&:hover": { backgroundColor: "#3700b3" } 
          }}
        >
          Select File
          <VisuallyHiddenInput type="file" onChange={handleFileSelect} />
        </Button>
        
        {datasetFile && datasetFile.name && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip 
              icon={getFileTypeIcon()} 
              label={datasetFile.name}
              variant="outlined" 
            />
            <Typography variant="caption">
              {datasetFile.size ? `(${(datasetFile.size / 1024).toFixed(2)} KB)` : ''}
            </Typography>
          </Box>
        )}

        <Button
          onClick={handleUpload}
          disabled={!datasetFile || loading}
          variant="contained"
          sx={{ 
            backgroundColor: "#4caf50", 
            "&:hover": { backgroundColor: "#388e3c" },
            color: 'white'
          }}
        >
          {loading ? <CircularProgress size={24} /> : "Upload"}
        </Button>

        {uploadStatus && (
          <Alert 
            severity={uploadStatus.startsWith("Error:") ? "error" : "success"}
            sx={{ width: '100%', marginTop: 2 }}
          >
            <AlertTitle>{uploadStatus.startsWith("Error:") ? "Error" : "Success"}</AlertTitle>
            {uploadStatus}
          </Alert>
        )}
      </Box>
    </Paper>
  );
};

export default UploadDataset;
