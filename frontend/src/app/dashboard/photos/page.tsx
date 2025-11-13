'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastContainer';
import Progress from '@/components/ui/Progress';
import { refPhotoAPI } from '@/lib/api';
import {
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Maximize2,
  ImagePlus
} from 'lucide-react';

interface RefPhoto {
  id: string;
  photoUrl?: string;
  signedUrl?: string;
  s3Url?: string;
  isActive: boolean;
  photoType: string;
  uploadedAt: string;
  rekognitionFaceId?: string;
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<RefPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<RefPhoto | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<RefPhoto | null>(null);
  const toast = useToast();

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      const response = await refPhotoAPI.getAll();
      setPhotos(response.data.refPhotos || []);
    } catch (err: any) {
      toast.error('Load Failed', 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File Too Large', 'Please upload an image smaller than 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('photoType', 'frontal');

    try {
      setUploading(true);
      setUploadProgress(0);

      // Simulate upload progress (in real app, use axios onUploadProgress)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await refPhotoAPI.upload(formData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      toast.success('Upload Successful!', 'Photo uploaded and face indexed successfully');
      await fetchPhotos();

      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Upload failed';
      toast.error('Upload Failed', errorMsg);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const handleDelete = async () => {
    if (!selectedPhoto) return;

    try {
      await refPhotoAPI.delete(selectedPhoto.id);
      toast.success('Deleted!', 'Photo deleted successfully');
      setDeleteModal(false);
      setSelectedPhoto(null);
      await fetchPhotos();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Delete failed';
      toast.error('Delete Failed', errorMsg);
    }
  };

  const handleToggleActive = async (photo: RefPhoto) => {
    try {
      if (photo.isActive) {
        await refPhotoAPI.deactivate(photo.id);
        toast.info('Deactivated', 'Photo deactivated - will not be used in scans');
      } else {
        await refPhotoAPI.activate(photo.id);
        toast.success('Activated!', 'Photo activated - will be used in scans');
      }
      await fetchPhotos();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to update photo status';
      toast.error('Update Failed', errorMsg);
    }
  };

  const handleViewPhoto = (photo: RefPhoto) => {
    setViewPhoto(photo);
    setViewModal(true);
  };

  // Statistics
  const activePhotos = photos.filter(p => p.isActive).length;
  const photosWithFaces = photos.filter(p => p.rekognitionFaceId).length;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reference Photos</h1>
        <p className="mt-2 text-gray-600">
          Upload photos of yourself to scan for across the web
        </p>
      </div>

      {/* Statistics Cards */}
      {photos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Photos</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{photos.length}</p>
              </div>
              <ImageIcon className="h-12 w-12 text-blue-400" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Active Photos</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{activePhotos}</p>
              </div>
              <Eye className="h-12 w-12 text-green-400" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Faces Detected</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">{photosWithFaces}</p>
              </div>
              <CheckCircle className="h-12 w-12 text-purple-400" />
            </div>
          </Card>
        </div>
      )}

      {/* Upload Section */}
      <Card className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Upload New Photo
        </h2>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-300 ${
            isDragActive
              ? 'border-orange-500 bg-orange-50 scale-105 shadow-lg'
              : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50/30'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <div className={`transition-transform duration-300 ${isDragActive ? 'scale-110' : ''}`}>
            <Upload className={`mx-auto h-12 w-12 mb-4 ${isDragActive ? 'text-orange-500' : 'text-gray-400'}`} />
          </div>
          {uploading ? (
            <div>
              <p className="text-lg text-gray-600 mb-4">Uploading photo...</p>
              <div className="max-w-md mx-auto">
                <Progress
                  value={uploadProgress}
                  variant="primary"
                  animated
                  showLabel
                  label="Upload Progress"
                />
              </div>
            </div>
          ) : isDragActive ? (
            <p className="text-lg text-orange-600 font-medium">Drop the photo here...</p>
          ) : (
            <div>
              <p className="text-lg text-gray-700 mb-2 font-medium">
                Drag and drop a photo here, or click to select
              </p>
              <p className="text-sm text-gray-500">
                Supported formats: JPEG, PNG (Max 5MB)
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Best results with clear frontal face photos
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Photos Grid */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Your Photos ({photos.length})
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} padding="none" className="overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-8 bg-gray-200 rounded" />
                </div>
              </Card>
            ))}
          </div>
        ) : photos.length === 0 ? (
          <Card className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="max-w-md mx-auto">
              <ImagePlus className="h-20 w-20 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No photos uploaded yet
              </h3>
              <p className="text-gray-500 mb-6">
                Upload your first photo above to start scanning for your images across the web
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <p className="text-sm font-medium text-blue-900 mb-2">💡 Tips for best results:</p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Use clear, well-lit photos</li>
                  <li>• Face should be clearly visible and frontal</li>
                  <li>• Avoid sunglasses or face coverings</li>
                  <li>• Higher resolution photos work better</li>
                </ul>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {photos.map((photo, index) => (
              <Card
                key={photo.id}
                padding="none"
                className="overflow-hidden group hover:shadow-xl transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="aspect-square relative bg-gray-100 overflow-hidden">
                  {(photo.signedUrl || photo.s3Url || photo.photoUrl) ? (
                    <>
                      <img
                        src={photo.signedUrl || photo.s3Url || photo.photoUrl}
                        alt="Reference photo"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="w-full h-full flex flex-col items-center justify-center bg-gray-200"><svg class="h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><p class="text-sm text-gray-500">Image unavailable</p></div>';
                          }
                        }}
                      />
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleViewPhoto(photo)}
                          className="transform scale-90 group-hover:scale-100 transition-transform"
                        >
                          <Maximize2 className="h-4 w-4 mr-2" />
                          View Full Size
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200">
                      <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">No image URL</p>
                    </div>
                  )}

                  {/* Status Badges */}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Badge
                      variant={photo.isActive ? 'success' : 'default'}
                      size="sm"
                      className="backdrop-blur-sm bg-opacity-90"
                    >
                      {photo.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  {/* Face Detection Indicator */}
                  {photo.rekognitionFaceId && (
                    <div className="absolute top-2 left-2">
                      <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm bg-opacity-90">
                        <CheckCircle className="h-3 w-3" />
                        Face Detected
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500">
                      {new Date(photo.uploadedAt).toLocaleDateString()}
                    </span>
                    <Badge size="sm" variant="default">{photo.photoType}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={photo.isActive ? 'ghost' : 'secondary'}
                      onClick={() => handleToggleActive(photo)}
                      className="flex-1"
                    >
                      {photo.isActive ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-1" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setSelectedPhoto(photo);
                        setDeleteModal(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal}
        onClose={() => {
          setDeleteModal(false);
          setSelectedPhoto(null);
        }}
        title="Delete Photo"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteModal(false);
                setSelectedPhoto(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <XCircle className="h-12 w-12 text-red-500" />
          </div>
          <div>
            <p className="text-gray-700 font-medium mb-2">
              Are you sure you want to delete this reference photo?
            </p>
            <p className="text-sm text-gray-500">
              This action cannot be undone. The photo will be permanently removed from your account
              and will no longer be used in scans.
            </p>
          </div>
        </div>
      </Modal>

      {/* View Photo Modal */}
      <Modal
        isOpen={viewModal}
        onClose={() => {
          setViewModal(false);
          setViewPhoto(null);
        }}
        title="Photo Details"
        size="lg"
      >
        {viewPhoto && (
          <div>
            <div className="mb-4 rounded-lg overflow-hidden bg-gray-100">
              {(viewPhoto.signedUrl || viewPhoto.s3Url || viewPhoto.photoUrl) ? (
                <img
                  src={viewPhoto.signedUrl || viewPhoto.s3Url || viewPhoto.photoUrl}
                  alt="Reference photo full size"
                  className="w-full h-auto max-h-96 object-contain"
                />
              ) : (
                <div className="w-full h-64 flex items-center justify-center bg-gray-200">
                  <ImageIcon className="h-16 w-16 text-gray-400" />
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm font-medium text-gray-600">Status</span>
                <Badge variant={viewPhoto.isActive ? 'success' : 'default'}>
                  {viewPhoto.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm font-medium text-gray-600">Photo Type</span>
                <span className="text-sm text-gray-900">{viewPhoto.photoType}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm font-medium text-gray-600">Uploaded</span>
                <span className="text-sm text-gray-900">
                  {new Date(viewPhoto.uploadedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-gray-600">Face Detection</span>
                <div className="flex items-center gap-2">
                  {viewPhoto.rekognitionFaceId ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600 font-medium">Detected</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600 font-medium">Not Detected</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
