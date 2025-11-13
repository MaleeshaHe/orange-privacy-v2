'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import Progress from '@/components/ui/Progress';
import { useToast } from '@/components/ui/ToastContainer';
import { scanJobAPI } from '@/lib/api';
import { Plus, Search, Clock, CheckCircle, XCircle, Loader, TrendingUp } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface ScanJob {
  id: string;
  scanType: string;
  status: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  matchesFound: number;
  confidenceThreshold: number;
}

interface CreateScanForm {
  scanType: string;
  confidenceThreshold: number;
}

export default function ScansPage() {
  const router = useRouter();
  const toast = useToast();
  const [scans, setScans] = useState<ScanJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [previousScans, setPreviousScans] = useState<ScanJob[]>([]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateScanForm>({
    defaultValues: {
      scanType: 'web',
      confidenceThreshold: 85,
    },
  });

  useEffect(() => {
    fetchScans();
    const interval = setInterval(fetchScans, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchScans = useCallback(async () => {
    try {
      const response = await scanJobAPI.getAll({ limit: 50 });
      const newScans = response.data.scanJobs || [];

      // Check for status changes and show notifications
      if (previousScans.length > 0) {
        newScans.forEach((newScan) => {
          const oldScan = previousScans.find((s) => s.id === newScan.id);
          if (oldScan && oldScan.status !== newScan.status) {
            // Status changed - show notification
            if (newScan.status === 'completed') {
              toast.success(
                'Scan Completed!',
                `Found ${newScan.matchesFound} match${newScan.matchesFound !== 1 ? 'es' : ''}`
              );
            } else if (newScan.status === 'failed') {
              toast.error('Scan Failed', 'Please try again or contact support');
            } else if (newScan.status === 'processing') {
              toast.info('Scan Started', 'Your scan is now processing...');
            }
          }
        });
      }

      setPreviousScans(newScans);
      setScans(newScans);

      // Clear any previous errors on successful fetch
      if (error) setError('');
    } catch (err: any) {
      // Only show error on initial load, not during polling
      if (loading) {
        if (err.code === 'ECONNABORTED') {
          setError('Connection timeout. Please check your internet connection.');
          toast.error('Connection Timeout', 'Please check your internet connection');
        } else if (err.message === 'Network Error') {
          setError('Cannot connect to server. Please check if the backend is running.');
          toast.error('Connection Error', 'Cannot connect to server');
        } else {
          setError('Failed to load scans. Retrying...');
        }
      } else {
        // During polling, just log the error without displaying to user
        console.error('Failed to fetch scans during polling:', err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [previousScans, error, loading, toast]);

  const onSubmit = async (data: CreateScanForm) => {
    try {
      setCreating(true);
      setError('');
      await scanJobAPI.create(data);

      toast.success('Scan Created!', 'Your scan has been queued and will start shortly');
      setCreateModal(false);
      reset();
      fetchScans();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create scan';
      setError(errorMessage);
      toast.error('Scan Creation Failed', errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'processing':
        return <Loader className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
      completed: 'success',
      failed: 'error',
      processing: 'info',
      queued: 'warning',
    };
    return variants[status] || 'default';
  };

  const getScanProgress = (scan: ScanJob): number => {
    if (scan.status === 'completed') return 100;
    if (scan.status === 'failed' || scan.status === 'cancelled') return 0;
    if (scan.status === 'queued') return 10;

    // For processing status, estimate progress based on time
    if (scan.status === 'processing' && scan.startedAt) {
      const startTime = new Date(scan.startedAt).getTime();
      const now = Date.now();
      const elapsed = now - startTime;

      // Estimate: assume scan takes ~5 minutes average
      const estimatedDuration = 5 * 60 * 1000; // 5 minutes in ms
      const progress = Math.min(90, 10 + (elapsed / estimatedDuration) * 80);
      return Math.round(progress);
    }

    return 0;
  };

  const getProgressVariant = (status: string): 'primary' | 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
      case 'cancelled':
        return 'error';
      case 'processing':
        return 'primary';
      default:
        return 'warning';
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Scan Jobs</h1>
          <p className="mt-2 text-gray-600">
            Monitor and manage your facial recognition scans
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreateModal(true)}>
          <Plus className="h-5 w-5 mr-2" />
          New Scan
        </Button>
      </div>

      {error && (
        <div className="mb-6 animate-fade-in">
          <Alert variant="error" onClose={() => setError('')}>
            {error}
          </Alert>
        </div>
      )}

      {/* Scans List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} padding="none">
              <div className="p-6 animate-pulse">
                <div className="flex items-start space-x-4">
                  <div className="rounded-full bg-gray-200 h-10 w-10" />
                  <div className="flex-1 space-y-3">
                    <div className="h-6 bg-gray-200 rounded w-1/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : scans.length === 0 ? (
        <Card className="text-center py-12">
          <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg text-gray-700 mb-2">No scans yet</p>
          <p className="text-gray-600 mb-6">
            Create your first scan to find your photos on the web
          </p>
          <Button variant="primary" onClick={() => setCreateModal(true)}>
            <Plus className="h-5 w-5 mr-2" />
            Create First Scan
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {scans.map((scan, index) => (
            <Card
              key={scan.id}
              padding="none"
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="mt-1">{getStatusIcon(scan.status)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {scan.scanType.charAt(0).toUpperCase() + scan.scanType.slice(1)} Scan
                        </h3>
                        <Badge variant={getStatusBadge(scan.status)}>
                          {scan.status}
                        </Badge>
                      </div>
                      {/* Progress Indicator for processing/queued scans */}
                      {(scan.status === 'processing' || scan.status === 'queued') && (
                        <div className="mb-4">
                          <Progress
                            value={getScanProgress(scan)}
                            variant={getProgressVariant(scan.status)}
                            animated={scan.status === 'processing'}
                            showLabel
                            label={scan.status === 'queued' ? 'Queued' : 'Processing'}
                          />
                        </div>
                      )}

                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <span className="font-medium">Created:</span>{' '}
                          {new Date(scan.createdAt).toLocaleString()}
                        </p>
                        {scan.startedAt && (
                          <p>
                            <span className="font-medium">Started:</span>{' '}
                            {new Date(scan.startedAt).toLocaleString()}
                          </p>
                        )}
                        {scan.completedAt && (
                          <p>
                            <span className="font-medium">Completed:</span>{' '}
                            {new Date(scan.completedAt).toLocaleString()}
                          </p>
                        )}
                        <p>
                          <span className="font-medium">Confidence Threshold:</span>{' '}
                          {scan.confidenceThreshold}%
                        </p>
                        {scan.status === 'completed' && (
                          <p className="flex items-center gap-1">
                            <span className="font-medium">Matches Found:</span>{' '}
                            <span className="text-orange-600 font-semibold">
                              {scan.matchesFound}
                            </span>
                            {scan.matchesFound > 0 && (
                              <TrendingUp className="h-4 w-4 text-orange-600" />
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => router.push(`/dashboard/results?scanId=${scan.id}`)}
                    >
                      View Results
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Scan Modal */}
      <Modal
        isOpen={createModal}
        onClose={() => {
          setCreateModal(false);
          reset();
        }}
        title="Create New Scan"
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scan Type
            </label>
            <select
              {...register('scanType', { required: 'Scan type is required' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="web">Web Scan</option>
              <option value="social">Social Media Scan</option>
              <option value="combined">Combined Scan</option>
            </select>
            {errors.scanType && (
              <p className="mt-1 text-sm text-red-600">{errors.scanType.message}</p>
            )}
          </div>

          <Input
            {...register('confidenceThreshold', {
              required: 'Confidence threshold is required',
              min: { value: 50, message: 'Minimum value is 50' },
              max: { value: 100, message: 'Maximum value is 100' },
              valueAsNumber: true,
            })}
            type="number"
            label="Confidence Threshold (%)"
            helperText="Minimum confidence level for matches (50-100)"
            error={errors.confidenceThreshold?.message}
          />

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Web scans may take several minutes to complete
              depending on the number of sources scanned.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCreateModal(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={creating}>
              {creating ? 'Creating...' : 'Create Scan'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
