import React, { useState, useEffect } from 'react';

function FileManager({ pin, onLogout }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    refreshFileList();
  }, [pin]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const refreshFileList = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/files?pin=${pin}`);
      const data = await response.json();
      
      if (data.ok) {
        setFiles(data.files || []);
      } else {
        showToast('Failed to load files', 'error');
      }
    } catch (err) {
      showToast('Error loading files', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files, isZip = false) => {
    if (!files || files.length === 0) {
      showToast('No files selected', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('pin', pin);
    
    for (const file of files) {
      if (isZip) {
        formData.append('files', file, file.name);
      } else {
        // For single files, just use the filename
        formData.append('files', file, file.name);
      }
    }

    try {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          if (data.ok) {
            showToast(`Successfully uploaded ${files.length} file(s)`);
            setUploadProgress(100);
            setTimeout(() => {
              setUploading(false);
              setUploadProgress(0);
            }, 1000);
            refreshFileList();
          } else {
            throw new Error(data.error || 'Upload failed');
          }
        } else {
          throw new Error('Upload failed');
        }
      });

      xhr.addEventListener('error', () => {
        showToast('Upload failed', 'error');
        setUploading(false);
        setUploadProgress(0);
      });

      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    } catch (err) {
      showToast(err.message, 'error');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (path) => {
    if (!window.confirm(`Are you sure you want to delete ${path}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/delete?path=${encodeURIComponent(path)}&pin=${pin}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      
      if (data.ok) {
        showToast(`Successfully deleted: ${path}`);
        refreshFileList();
      } else {
        throw new Error(data.error || 'Delete failed');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDownload = (path) => {
    window.location.href = `/api/download?path=${encodeURIComponent(path)}&pin=${pin}`;
  };

  const handleDownloadAll = () => {
    window.location.href = `/api/download-all?pin=${pin}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">File Management System</h1>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-dashed border-gray-300 hover:border-blue-400 transition">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Upload Single File</h3>
            <input
              id="fileInput"
              type="file"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileUpload(e.target.files, false);
                }
              }}
            />
            <label
              htmlFor="fileInput"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center font-semibold py-3 px-4 rounded-lg cursor-pointer transition shadow-md hover:shadow-lg"
            >
              Select File
            </label>
            {uploading && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">Uploading... {Math.round(uploadProgress)}%</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-dashed border-gray-300 hover:border-blue-400 transition">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Upload Zip File</h3>
            <input
              id="zipInput"
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileUpload(e.target.files, true);
                }
              }}
            />
            <label
              htmlFor="zipInput"
              className="block w-full bg-green-600 hover:bg-green-700 text-white text-center font-semibold py-3 px-4 rounded-lg cursor-pointer transition shadow-md hover:shadow-lg"
            >
              Select Zip File
            </label>
            {uploading && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">Uploading... {Math.round(uploadProgress)}%</p>
              </div>
            )}
          </div>
        </div>

        {/* File List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Your Files</h2>
            {files.length > 0 && (
              <button
                onClick={handleDownloadAll}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium flex items-center space-x-2"
              >
                <span>📦</span>
                <span>Download All as ZIP</span>
              </button>
            )}
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading files...</div>
          ) : files.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No files uploaded yet</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="px-6 py-4 hover:bg-gray-50 transition flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <span className="text-2xl">📄</span>
                    <span className="text-gray-800 truncate">{file.path}</span>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleDownload(file.path)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm font-medium"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(file.path)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 px-6 py-4 rounded-lg shadow-lg text-white font-medium z-50 transition-all ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default FileManager;

