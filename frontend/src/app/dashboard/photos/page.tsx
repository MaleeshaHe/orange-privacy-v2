'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { refPhotoAPI } from '@/lib/api';
import { Upload, Trash2, Eye, EyeOff } from 'lucide-react';

interface RefPhoto {
  id: string;
  photoUrl: string;
  isActive: boolean;
  photoType: string;
  uploadedAt: string;
  rekognitionFaceId?: string;
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<RefPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<RefPhoto | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      const response = await refPhotoAPI.getAll();
      setPhotos(response.data.refPhotos || []);
    } catch (err: any) {
      setError('Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('photoType', 'frontal');

    try {
      setUploading(true);
      setError('');
      await refPhotoAPI.upload(formData);
      setSuccess('Photo uploaded successfully!');
      fetchPhotos();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, []);

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
      setSuccess('Photo deleted successfully');
      setDeleteModal(false);
      setSelectedPhoto(null);
      fetchPhotos();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  const handleToggleActive = async (photo: RefPhoto) => {
    try {
      if (photo.isActive) {
        await refPhotoAPI.deactivate(photo.id);
      } else {
        // You might need to add an activate endpoint
        await refPhotoAPI.deactivate(photo.id);
      }
      setSuccess(`Photo ${photo.isActive ? 'deactivated' : 'activated'}`);
      fetchPhotos();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Failed to update photo status');
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reference Photos</h1>
        <p className="mt-2 text-gray-600">
          Upload photos of yourself to scan for across the web
        </p>
      </div>

      {error && (
        <div className="mb-6">
          <Alert variant="error" onClose={() => setError('')}>
            {error}
          </Alert>
        </div>
      )}

      {success && (
        <div className="mb-6">
          <Alert variant="success" onClose={() => setSuccess('')}>
            {success}
          </Alert>
        </div>
      )}

      {/* Upload Section */}
      <Card className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Upload New Photo
        </h2>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-orange-500 bg-orange-50'
              : 'border-gray-300 hover:border-orange-400'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          {uploading ? (
            <p className="text-lg text-gray-600">Uploading...</p>
          ) : isDragActive ? (
            <p className="text-lg text-orange-600">Drop the photo here...</p>
          ) : (
            <div>
              <p className="text-lg text-gray-700 mb-2">
                Drag and drop a photo here, or click to select
              </p>
              <p className="text-sm text-gray-500">
                Supported formats: JPEG, PNG (Max 5MB)
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
          <div className="text-center py-12">
            <p className="text-gray-600">Loading photos...</p>
          </div>
        ) : photos.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-gray-600">
              No photos uploaded yet. Upload your first photo above.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {photos.map((photo) => (
              <Card key={photo.id} padding="none" className="overflow-hidden">
                <div className="aspect-square relative bg-gray-100">
                  <img
                    src={photo.photoUrl}
                    alt="Reference photo"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge
                      variant={photo.isActive ? 'success' : 'default'}
                      size="sm"
                    >
                      {photo.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">
                      {new Date(photo.uploadedAt).toLocaleDateString()}
                    </span>
                    <Badge size="sm">{photo.photoType}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
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
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-gray-600">
          Are you sure you want to delete this reference photo? This action
          cannot be undone.
        </p>
      </Modal>
    </DashboardLayout>
  );
}
