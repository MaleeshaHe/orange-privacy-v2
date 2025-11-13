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
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    confidence: 'all', // all, high (>=90), medium (75-89), low (<75)
    sourceType: 'all', // all, web, social_media
    confirmationStatus: 'all' // all, confirmed, rejected, pending
  });
  const [filteredResults, setFilteredResults] = useState<ScanResult[]>([]);

  useEffect(() => {
    fetchScans();
  }, []);

  useEffect(() => {
    if (selectedScan) {
      fetchResults(selectedScan);
    }
  }, [selectedScan]);

  useEffect(() => {
    applyFilters();
  }, [results, filters]);

  const applyFilters = () => {
    let filtered = [...results];

    // Filter by confidence
    if (filters.confidence !== 'all') {
      filtered = filtered.filter(r => {
        if (filters.confidence === 'high') return r.confidence >= 90;
        if (filters.confidence === 'medium') return r.confidence >= 75 && r.confidence < 90;
        if (filters.confidence === 'low') return r.confidence < 75;
        return true;
      });
    }

    // Filter by source type
    if (filters.sourceType !== 'all') {
      filtered = filtered.filter(r => r.sourceType === filters.sourceType);
    }

    // Filter by confirmation status
    if (filters.confirmationStatus !== 'all') {
      filtered = filtered.filter(r => {
        if (filters.confirmationStatus === 'confirmed') return r.isConfirmedByUser === true;
        if (filters.confirmationStatus === 'rejected') return r.isConfirmedByUser === false;
        if (filters.confirmationStatus === 'pending') return r.isConfirmedByUser === undefined || r.isConfirmedByUser === null;
        return true;
      });
    }

    setFilteredResults(filtered);
  };

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
      setError('');
      setConfirmingId(resultId);
      await scanResultAPI.updateConfirmation(resultId, isConfirmed);
      setSuccess(`Match ${isConfirmed ? 'confirmed' : 'rejected'} successfully`);
      if (selectedScan) {
        await fetchResults(selectedScan);
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Confirmation error:', err);
      setError(err.response?.data?.error || `Failed to ${isConfirmed ? 'confirm' : 'reject'} match`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setConfirmingId(null);
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Matches</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalMatches}</p>
              </div>
              <ImageIcon className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Confirmed Matches</p>
                <p className="text-2xl font-bold text-gray-900">{stats.confirmedMatches}</p>
              </div>
              <ThumbsUp className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Filtered Results</p>
                <p className="text-2xl font-bold text-gray-900">{filteredResults.length}</p>
              </div>
              <ImageIcon className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      {selectedScan && results.length > 0 && (
        <Card className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Confidence Level
              </label>
              <select
                value={filters.confidence}
                onChange={(e) => setFilters({ ...filters, confidence: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Confidence Levels</option>
                <option value="high">High (≥90%)</option>
                <option value="medium">Medium (75-89%)</option>
                <option value="low">Low (&lt;75%)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Source Type
              </label>
              <select
                value={filters.sourceType}
                onChange={(e) => setFilters({ ...filters, sourceType: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Sources</option>
                <option value="web">Web</option>
                <option value="social_media">Social Media</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.confirmationStatus}
                onChange={(e) => setFilters({ ...filters, confirmationStatus: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Review</option>
                <option value="confirmed">Confirmed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          {(filters.confidence !== 'all' || filters.sourceType !== 'all' || filters.confirmationStatus !== 'all') && (
            <div className="mt-4">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setFilters({ confidence: 'all', sourceType: 'all', confirmationStatus: 'all' })}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </Card>
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
      ) : filteredResults.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-600">No results match the selected filters.</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setFilters({ confidence: 'all', sourceType: 'all', confirmationStatus: 'all' })}
            className="mt-4"
          >
            Clear Filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredResults.map((result) => (
            <Card key={result.id} padding="none" className="overflow-hidden hover:shadow-lg transition-shadow">
              <div
                className="aspect-square relative bg-gray-100 cursor-pointer group"
                onClick={() => {
                  setSelectedResult(result);
                  setImageModal(true);
                }}
              >
                {(result.imageUrl || result.thumbnailUrl) ? (
                  <img
                    src={result.imageUrl || result.thumbnailUrl}
                    alt="Match"
                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="w-full h-full flex flex-col items-center justify-center bg-gray-200"><svg class="h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><p class="text-xs text-gray-500">Image unavailable</p></div>';
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200">
                    <ImageIcon className="h-10 w-10 text-gray-400 mb-2" />
                    <p className="text-xs text-gray-500">No image</p>
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <Badge variant="info" size="sm">
                    {result.sourceType === 'social_media' ? 'Social' : 'Web'}
                  </Badge>
                </div>
                <div className="absolute top-2 right-2">
                  <span
                    className={`inline-block px-2 py-1 text-sm font-bold rounded ${
                      result.confidence >= 90
                        ? 'bg-green-100 text-green-800'
                        : result.confidence >= 75
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}
                  >
                    {result.confidence}%
                  </span>
                </div>
                {result.isConfirmedByUser !== undefined && (
                  <div className="absolute bottom-2 left-2 right-2">
                    <div
                      className={`text-xs font-medium px-2 py-1 rounded text-center ${
                        result.isConfirmedByUser
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {result.isConfirmedByUser ? '✓ Confirmed' : '✗ Rejected'}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3">

                <div className="space-y-2">
                  <div className="text-xs text-gray-600">
                    <a
                      href={result.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-600 hover:text-orange-700 flex items-center gap-1 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="truncate flex-1">View Source</span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  </div>

                  <div className="text-xs text-gray-500">
                    {new Date(result.createdAt).toLocaleDateString()}
                  </div>

                  {result.isConfirmedByUser === undefined || result.isConfirmedByUser === null ? (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmation(result.id, true);
                        }}
                        disabled={confirmingId === result.id}
                        className="flex-1 text-xs py-1"
                      >
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        {confirmingId === result.id ? 'Confirming...' : 'Confirm'}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmation(result.id, false);
                        }}
                        disabled={confirmingId === result.id}
                        className="flex-1 text-xs py-1"
                      >
                        <ThumbsDown className="h-3 w-3 mr-1" />
                        {confirmingId === result.id ? 'Rejecting...' : 'Reject'}
                      </Button>
                    </div>
                  ) : null}
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
