import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ScanResultView from "../components/views/ScanResultView";
import CameraCapture from "../components/camera/CameraCapture";

export default function ScanResultPage() {
  const { scannerResult, scanResultLoading, capturedImageBase64, isResolveFlow, cases, activeResolveCaseId, agentModels, handleConfirmScanResult, setScannerResult, setCapturedImageBase64, setActiveCameraOpen, setIsResolveFlow, setIsRejectionFlow, handleCaptureComplete } = useAuth();
  const navigate = useNavigate();
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(() => {
    if (!scannerResult && !scanResultLoading && !capturedImageBase64) {
      setIsResolveFlow(false);
      setIsRejectionFlow(false);
      setCameraOpen(true);
    }
    return () => {
      setCameraOpen(false);
      setActiveCameraOpen(false);
    };
  }, []);

  useEffect(() => {
    if (scannerResult || capturedImageBase64) {
      setCameraOpen(false);
    }
  }, [scannerResult, capturedImageBase64]);

  const handleCloseCamera = () => {
    setCameraOpen(false);
    setActiveCameraOpen(false);
    setScannerResult(null);
    setCapturedImageBase64("");
    navigate("/patrol", { replace: true });
  };

  const handleCapture = (base64: string, lat?: number, lng?: number) => {
    setCameraOpen(false);
    setActiveCameraOpen(false);
    handleCaptureComplete(base64, lat, lng);
  };

  if (cameraOpen) {
    return <CameraCapture onCapture={handleCapture} onClose={handleCloseCamera} />;
  }

  if (!scanResultLoading && !scannerResult && !capturedImageBase64) return null;

  return (
    <ScanResultView
      loading={scanResultLoading}
      capturedImage={capturedImageBase64}
      isResolveFlow={isResolveFlow}
      beforeImage={cases.find(c => c.id === activeResolveCaseId)?.imageUrl}
      analysisResult={scannerResult}
      onConfirm={handleConfirmScanResult}
      selectedModel={isResolveFlow ? agentModels.resolver : agentModels.scanner}
      onCancel={() => {
        setScannerResult(null);
        setCapturedImageBase64("");
        navigate("/patrol", { replace: true });
      }}
    />
  );
}
