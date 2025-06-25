'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, MapPin, Grid, AlertCircle, CheckCircle, Info, Ruler } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateCalibrationReport, type CalibrationData } from '@/lib/coordinate-utils';

interface FloorPlanCalibrationProps {
  apartmentSize: number; // Total apartment size in square meters
  floorPlanImage?: string;
  calibrationData?: CalibrationData;
  onFloorPlanChange: (imageData: string) => void;
  onCalibrationChange: (calibrationData: CalibrationData) => void;
  className?: string;
}

export function FloorPlanCalibration({
  apartmentSize,
  floorPlanImage,
  calibrationData,
  onFloorPlanChange,
  onCalibrationChange,
  className
}: FloorPlanCalibrationProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle file upload
  const handleFileUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onFloorPlanChange(result);
      setImageLoaded(false); // Reset loaded state for new image
    };
    reader.readAsDataURL(file);
  }, [onFloorPlanChange]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  // Handle image load to get dimensions
  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      setImageDimensions({ width: naturalWidth, height: naturalHeight });
      setImageLoaded(true);
      console.log(`🖼️ Floor plan loaded: ${naturalWidth}x${naturalHeight}px`);
    }
  }, []);

  // Handle anchor point selection
  const handleAnchorClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || !imageLoaded) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Calculate estimated dimensions based on apartment size
    // Assume roughly square apartment for initial estimation
    const estimatedSideLength = Math.sqrt(apartmentSize);
    const aspectRatio = imageDimensions.width / imageDimensions.height;
    
    let realWidth, realHeight;
    if (aspectRatio > 1) {
      // Wider than tall
      realWidth = estimatedSideLength * Math.sqrt(aspectRatio);
      realHeight = estimatedSideLength / Math.sqrt(aspectRatio);
    } else {
      // Taller than wide
      realWidth = estimatedSideLength * Math.sqrt(aspectRatio);
      realHeight = estimatedSideLength / Math.sqrt(aspectRatio);
    }

    // Adjust to match total area
    const currentArea = realWidth * realHeight;
    const scaleFactor = Math.sqrt(apartmentSize / currentArea);
    realWidth *= scaleFactor;
    realHeight *= scaleFactor;

    const pixelsPerMeter = Math.min(
      imageDimensions.width / realWidth,
      imageDimensions.height / realHeight
    );

    const newCalibrationData: CalibrationData = {
      anchorPoint: { x, y },
      realWorldSize: { width: realWidth, height: realHeight },
      imageSize: imageDimensions,
      pixelsPerMeter
    };

    onCalibrationChange(newCalibrationData);
    console.log('🎯 Anchor point set:', { x, y }, 'Calibration:', newCalibrationData);
  }, [apartmentSize, imageDimensions, imageLoaded, onCalibrationChange]);

  // Generate calibration report
  const calibrationReport = calibrationData ? generateCalibrationReport(calibrationData, []) : null;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Upload Section */}
      {!floorPlanImage ? (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragging
              ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
              : "border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Upload Your Floor Plan
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Drag and drop your floor plan image here, or click to browse
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Choose File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Supports JPG, PNG, and other image formats
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Calibration Instructions */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Grid className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Set Anchor Point for Calibration
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Click on a corner of your floor plan to set it as the origin point (0,0). 
                This will be used to calibrate all measurements and beacon positions.
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Apartment size: {apartmentSize}m² • Choose a corner that's easy to identify
              </p>
            </div>
          </div>

          {/* Floor Plan Image with Calibration */}
          <div className="relative">
            <div
              ref={containerRef}
              className={cn(
                "relative w-full bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border-2",
                "aspect-[16/9] cursor-crosshair",
                calibrationData ? "border-green-500" : "border-gray-300 dark:border-gray-600"
              )}
              onClick={handleAnchorClick}
            >
              <img
                ref={imageRef}
                src={floorPlanImage}
                alt="Floor Plan"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                onLoad={handleImageLoad}
                draggable={false}
              />

              {/* Anchor Point Marker */}
              {calibrationData && imageLoaded && (
                <div
                  className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 z-10"
                  style={{
                    left: `${calibrationData.anchorPoint.x}%`,
                    top: `${calibrationData.anchorPoint.y}%`,
                  }}
                >
                  <div className="w-full h-full bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                    <MapPin className="h-3 w-3 text-white" />
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-red-500 text-white text-xs rounded whitespace-nowrap">
                    Origin (0,0)
                  </div>
                </div>
              )}

              {/* Grid overlay for better visualization */}
              {calibrationData && imageLoaded && (
                <div className="absolute inset-0 pointer-events-none">
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {/* Grid lines every 10% */}
                    {Array.from({ length: 11 }, (_, i) => (
                      <g key={i}>
                        <line
                          x1={i * 10}
                          y1={0}
                          x2={i * 10}
                          y2={100}
                          stroke="rgba(59, 130, 246, 0.2)"
                          strokeWidth="0.2"
                        />
                        <line
                          x1={0}
                          y1={i * 10}
                          x2={100}
                          y2={i * 10}
                          stroke="rgba(59, 130, 246, 0.2)"
                          strokeWidth="0.2"
                        />
                      </g>
                    ))}
                  </svg>
                </div>
              )}

              {/* Loading indicator */}
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading floor plan...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Change Image Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute top-2 right-2 px-3 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Change Image
            </button>
          </div>

          {/* Calibration Status */}
          {calibrationData ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-900 dark:text-green-100 mb-1">
                    Calibration Complete
                  </h4>
                  <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                    <p>✅ Anchor point: ({calibrationData.anchorPoint.x.toFixed(1)}%, {calibrationData.anchorPoint.y.toFixed(1)}%)</p>
                    <p>✅ Estimated dimensions: {calibrationData.realWorldSize.width.toFixed(1)}m × {calibrationData.realWorldSize.height.toFixed(1)}m</p>
                    <p>✅ Scale: {calibrationData.pixelsPerMeter.toFixed(1)} pixels per meter</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-green-600 hover:text-green-700 transition-colors"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>

              {/* Advanced Calibration Details */}
              {showAdvanced && calibrationReport && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Ruler className="h-4 w-4" />
                    Calibration Details
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 mb-1">Image Information</p>
                      <p className="font-mono text-gray-900 dark:text-white">{calibrationReport.details.imageInfo}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 mb-1">Scale Factor</p>
                      <p className="font-mono text-gray-900 dark:text-white">{calibrationReport.details.scaleInfo}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 mb-1">Anchor Position</p>
                      <p className="font-mono text-gray-900 dark:text-white">{calibrationReport.details.anchorInfo}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 mb-1">Calculated Area</p>
                      <p className="font-mono text-gray-900 dark:text-white">{calibrationReport.details.areaInfo}</p>
                    </div>
                  </div>
                  
                  {/* Area Validation */}
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Area Check:</strong> Input {apartmentSize}m² vs Calculated {(calibrationData.realWorldSize.width * calibrationData.realWorldSize.height).toFixed(1)}m²
                      {Math.abs(apartmentSize - (calibrationData.realWorldSize.width * calibrationData.realWorldSize.height)) > apartmentSize * 0.1 && (
                        <span className="text-orange-600 dark:text-orange-400 ml-2">
                          ⚠️ Significant difference - consider adjusting anchor point
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                  Calibration Required
                </h4>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Click on a corner of your floor plan to set the anchor point and complete calibration.
                </p>
              </div>
            </div>
          )}

          {/* Calibration Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              📐 Calibration Tips
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Choose a corner that's clearly visible and easy to identify</li>
              <li>• The anchor point will be used as the origin (0,0) for all measurements</li>
              <li>• All beacon positions will be calculated relative to this point</li>
              <li>• You can click a different corner to recalibrate if needed</li>
              <li>• The system automatically estimates dimensions based on your apartment size</li>
            </ul>
          </div>
        </div>
      )}

      {/* Hidden file input for change image */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
} 