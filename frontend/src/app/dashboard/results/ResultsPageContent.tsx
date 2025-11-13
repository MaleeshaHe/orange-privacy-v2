'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { scanJobAPI, scanResultAPI } from '@/lib/api';
import { ExternalLink, ThumbsUp, ThumbsDown, Image as ImageIcon } from 'lucide-react';

interface ScanResult {
  id: string;
  sourceUrl: string;
  sourceType: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  confidence: number;
  isConfirmedByUser?: boolean;
  createdAt: string;
}

interface ScanJob {
  id: string;
  scanType: string;
  status: string;
  createdAt: string;
}

export default function ResultsPageContent() {
  const searchParams = useSearchParams();
  const scanId = searchParams.get('scanId');

  const [scans, setScans] = useState<ScanJob[]>([]);
  const [selectedScan, setSelectedScan] = useState<string | null>(scanId);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [stats, setStats] = useState({ totalMatches: 0, confirmedMatches: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedResult, setSelectedResult] = useState<ScanResult | null>(null);
  const [imageModal, setImageModal] = useState(false);

  useEffect(() => {
    fetchScans();
  }, []);

  useEffect(() => {
    if (selectedScan) {
      fetchResults(selectedScan);
    }
  }, [selectedScan]);

  const fetchScans = async () => {
    try {
      const response = await scanJobAPI.getAll({ status: 'completed' });
      setScans(response.data.scanJobs || []);
      if (!selectedScan && response.data.scanJobs.length > 0) {
        setSelectedScan(response.data.scanJobs[0].id);
      }
    } catch (err: any) {
      setError('Failed to load scans');
    }
  };

  const fetchResults = async (scanJobId: string) => {
    try {
      setLoading(true);
      const [resultsRes, statsRes] = await Promise.all([
        scanResultAPI.getByScanJob(scanJobId),
        scanResultAPI.getStats(scanJobId),
      ]);
      setResults(resultsRes.data.results || []);
      setStats(statsRes.data || { totalMatches: 0, confirmedMatches: 0 });
    } catch (err: any) {
      setError('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmation = async (resultId: string, isConfirmed: boolean) => {
    try {
      await scanResultAPI.updateConfirmation(resultId, isConfirmed);
      setSuccess(`Match ${isConfirmed ? 'confirmed' : 'rejected'}`);
      if (selectedScan) {
        fetchResults(selectedScan);
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Failed to update confirmation');
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 75) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Scan Results</h1>
        <p className="mt-2 text-gray-600">
          Review matches found during facial recognition scans
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

      {/* Scan Selector */}
      {scans.length > 0 && (
        <Card className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Scan Job
          </label>
          <select
            value={selectedScan || ''}
            onChange={(e) => setSelectedScan(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {scans.map((scan) => (
              <option key={scan.id} value={scan.id}>
                {scan.scanType.charAt(0).toUpperCase() + scan.scanType.slice(1)} -{' '}
                {new Date(scan.createdAt).toLocaleString()}
              </option>
            ))}
          </select>
        </Card>
      )}

      {/* Stats */}
      {selectedScan && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Matches</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalMatches}</p>
              </div>
              <ImageIcon className="h-10 w-10 text-blue-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Confirmed Matches</p>
                <p className="text-3xl font-bold text-gray-900">{stats.confirmedMatches}</p>
              </div>
              <ThumbsUp className="h-10 w-10 text-green-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Results Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading results...</p>
        </div>
      ) : !selectedScan ? (
        <Card className="text-center py-12">
          <p className="text-gray-600">
            No completed scans found. Create a scan to see results.
          </p>
        </Card>
      ) : results.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-600">No matches found in this scan.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {results.map((result) => (
            <Card key={result.id} padding="none">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Badge variant="info" size="sm">
                      {result.sourceType}
                    </Badge>
                  </div>
                  <span
                    className={`text-2xl font-bold ${getConfidenceColor(result.confidence)}`}
                  >
                    {result.confidence}%
                  </span>
                </div>

                <div
                  className="aspect-video relative bg-gray-100 rounded-lg overflow-hidden mb-4 cursor-pointer"
                  onClick={() => {
                    setSelectedResult(result);
                    setImageModal(true);
                  }}
                >
                  {(result.imageUrl || result.thumbnailUrl) ? (
                    <img
                      src={result.imageUrl || result.thumbnailUrl}
                      alt="Match"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="w-full h-full flex flex-col items-center justify-center bg-gray-200"><svg class="h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><p class="text-sm text-gray-500">Image unavailable</p></div>';
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200">
                      <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">No image URL</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    <p className="mb-1">
                      <span className="font-medium">Source:</span>
                    </p>
                    <a
                      href={result.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-600 hover:text-orange-700 flex items-center gap-1"
                    >
                      <span className="truncate">{result.sourceUrl}</span>
                      <ExternalLink className="h-4 w-4 flex-shrink-0" />
                    </a>
                  </div>

                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Detected:</span>{' '}
                    {new Date(result.createdAt).toLocaleString()}
                  </div>

                  {result.isConfirmedByUser !== undefined ? (
                    <div
                      className={`p-3 rounded-lg ${
                        result.isConfirmedByUser
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <p
                        className={`text-sm font-medium ${
                          result.isConfirmedByUser ? 'text-green-800' : 'text-red-800'
                        }`}
                      >
                        {result.isConfirmedByUser ? 'Confirmed Match' : 'Rejected Match'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleConfirmation(result.id, true)}
                        className="flex-1"
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleConfirmation(result.id, false)}
                        className="flex-1"
                      >
                        <ThumbsDown className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Image Modal */}
      <Modal
        isOpen={imageModal}
        onClose={() => {
          setImageModal(false);
          setSelectedResult(null);
        }}
        title="Match Details"
        size="xl"
      >
        {selectedResult && (
          <div className="space-y-4">
            {(selectedResult.imageUrl || selectedResult.thumbnailUrl) ? (
              <img
                src={selectedResult.imageUrl || selectedResult.thumbnailUrl}
                alt="Match"
                className="w-full rounded-lg"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="w-full flex flex-col items-center justify-center bg-gray-200 p-12 rounded-lg"><svg class="h-16 w-16 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><p class="text-sm text-gray-500">Image unavailable</p></div>';
                  }
                }}
              />
            ) : (
              <div className="w-full flex flex-col items-center justify-center bg-gray-200 p-12 rounded-lg">
                <ImageIcon className="h-16 w-16 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">No image URL available</p>
              </div>
            )}
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Confidence:</span>{' '}
                <span className={getConfidenceColor(selectedResult.confidence)}>
                  {selectedResult.confidence}%
                </span>
              </p>
              <p>
                <span className="font-medium">Source Type:</span> {selectedResult.sourceType}
              </p>
              <p>
                <span className="font-medium">URL:</span>{' '}
                <a
                  href={selectedResult.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-600 hover:text-orange-700"
                >
                  {selectedResult.sourceUrl}
                </a>
              </p>
              <p>
                <span className="font-medium">Detected:</span>{' '}
                {new Date(selectedResult.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
