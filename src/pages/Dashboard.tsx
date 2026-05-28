import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useScenes } from '../hooks/useScenes'
import { useFolders } from '../hooks/useFolders'

export default function Dashboard() {
    const { user, signOut } = useAuth()
    const { scenes, loading: scenesLoading, error: scenesError, createScene, deleteScene, updateScene } = useScenes()
    const { folders, error: foldersError, createFolder, renameFolder, deleteFolder } = useFolders()
    const [showUserMenu, setShowUserMenu] = useState(false)
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
    const [darkMode, setDarkMode] = useState(true)
    const [editingSceneId, setEditingSceneId] = useState<string | null>(null)
    const [editingSceneName, setEditingSceneName] = useState('')
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
    const [editingFolderName, setEditingFolderName] = useState('')
    const [sceneContextMenu, setSceneContextMenu] = useState<{ sceneId: string; x: number; y: number } | null>(null)
    const [folderContextMenu, setFolderContextMenu] = useState<{ folderId: string; x: number; y: number } | null>(null)
    const navigate = useNavigate()

    // Apply theme
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    }, [darkMode])

    // Close context menus on click outside
    useEffect(() => {
        const handleClick = () => {
            setSceneContextMenu(null)
            setFolderContextMenu(null)
        }
        document.addEventListener('click', handleClick)
        return () => document.removeEventListener('click', handleClick)
    }, [])

    const handleCreateScene = useCallback(async () => {
        const scene = await createScene(selectedFolder)
        if (scene) {
            navigate(`/editor/${scene.id}`)
        }
    }, [createScene, selectedFolder, navigate])

    const handleCreateFolder = useCallback(async () => {
        await createFolder('New Folder')
    }, [createFolder])

    const handleDeleteScene = useCallback(async (e: React.MouseEvent, sceneId: string) => {
        e.stopPropagation() // Prevent navigating to the scene
        const confirmed = confirm('Are you sure you want to delete this scene?')
        if (confirmed) {
            await deleteScene(sceneId)
        }
    }, [deleteScene])

    const handleRenameScene = (e: React.MouseEvent, sceneId: string, currentName: string) => {
        e.stopPropagation()
        setEditingSceneId(sceneId)
        setEditingSceneName(currentName)
    }

    const handleSaveSceneName = async (sceneId: string) => {
        if (editingSceneName.trim()) {
            await updateScene(sceneId, { name: editingSceneName.trim() })
        }
        setEditingSceneId(null)
        setEditingSceneName('')
    }

    const handleMoveScene = useCallback(async (sceneId: string, folderId: string | null) => {
        await updateScene(sceneId, { folder_id: folderId })
        setSceneContextMenu(null)
    }, [updateScene])

    const handleSceneContextMenu = (e: React.MouseEvent, sceneId: string) => {
        e.preventDefault()
        e.stopPropagation()
        setSceneContextMenu({ sceneId, x: e.clientX, y: e.clientY })
    }

    const handleRenameFolder = (e: React.MouseEvent, folderId: string, currentName: string) => {
        e.stopPropagation()
        setEditingFolderId(folderId)
        setEditingFolderName(currentName)
    }

    const handleSaveFolderName = async (folderId: string) => {
        if (editingFolderName.trim()) {
            await renameFolder(folderId, editingFolderName.trim())
        }
        setEditingFolderId(null)
        setEditingFolderName('')
    }

    const handleDeleteFolder = async (e: React.MouseEvent, folderId: string) => {
        e.stopPropagation()
        const confirmed = confirm('Are you sure you want to delete this folder? Scenes in this folder will be moved to "All Scenes".')
        if (confirmed) {
            // Move scenes out of folder first
            const scenesInFolder = scenes.filter(s => s.folder_id === folderId)
            for (const scene of scenesInFolder) {
                await updateScene(scene.id, { folder_id: null })
            }
            await deleteFolder(folderId)
            if (selectedFolder === folderId) {
                setSelectedFolder(null)
            }
        }
    }

    const handleFolderContextMenu = (e: React.MouseEvent, folderId: string) => {
        e.preventDefault()
        e.stopPropagation()
        setFolderContextMenu({ folderId, x: e.clientX, y: e.clientY })
    }

    const handleLogout = useCallback(async () => {
        await signOut()
        navigate('/login')
    }, [signOut, navigate])

    const filteredScenes = selectedFolder
        ? scenes.filter((s) => s.folder_id === selectedFolder)
        : scenes

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    // Combine errors from hooks
    const dashboardError = scenesError || foldersError

    return (
        <div className={`dashboard ${darkMode ? 'dark' : 'light'}`}>
            {/* Error Banner */}
            {dashboardError && (
                <div aria-live="polite" style={{
                    position: 'fixed',
                    top: '16px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1000,
                    background: '#dc3545',
                    color: '#fff',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    fontSize: '0.875rem',
                    maxWidth: '500px',
                    textAlign: 'center',
                }}>
                    {dashboardError}
                </div>
            )}
            {/* Sidebar */}
            <aside className="dashboard-sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <span>✏️</span>
                        <span>Drawly</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {/* All Scenes */}
                    <div className="nav-section">
                        <button
                            className={`nav-item ${selectedFolder === null ? 'active' : ''}`}
                            onClick={() => setSelectedFolder(null)}
                        >
                            <span>🏠</span>
                            <span>All Scenes</span>
                        </button>
                    </div>

                    {/* Folders */}
                    <div className="nav-section">
                        <div className="nav-section-title">
                            <span>Folders</span>
                            <button
                                className="icon-btn"
                                onClick={handleCreateFolder}
                                title="New Folder"
                            >
                                ➕
                            </button>
                        </div>
                        <div className="folder-tree">
                            {folders.map((folder) => (
                                <div
                                    key={folder.id}
                                    className={`folder-item ${selectedFolder === folder.id ? 'active' : ''}`}
                                    onClick={() => setSelectedFolder(folder.id)}
                                    onContextMenu={(e) => handleFolderContextMenu(e, folder.id)}
                                    aria-label={`Folder: ${folder.name}`}
                                >
                                    <span className="folder-icon">📁</span>
                                    {editingFolderId === folder.id ? (
                                        <input
                                            type="text"
                                            className="folder-name-input"
                                            value={editingFolderName}
                                            onChange={(e) => setEditingFolderName(e.target.value)}
                                            onBlur={() => handleSaveFolderName(folder.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveFolderName(folder.id)
                                                if (e.key === 'Escape') {
                                                    setEditingFolderId(null)
                                                    setEditingFolderName('')
                                                }
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            autoFocus
                                        />
                                    ) : (
                                        <span>{folder.name}</span>
                                    )}
                                    <div className="folder-actions">
                                        <button
                                            className="folder-action-btn"
                                            onClick={(e) => handleRenameFolder(e, folder.id, folder.name)}
                                            title="Rename Folder"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className="folder-action-btn"
                                            onClick={(e) => handleDeleteFolder(e, folder.id)}
                                            title="Delete Folder"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {folders.length === 0 && (
                                <div style={{ padding: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                    No folders yet
                                </div>
                            )}
                        </div>
                    </div>
                </nav>

                {/* User Menu */}
                <div className="sidebar-footer">
                    {/* Theme Toggle */}
                    <button
                        className="theme-toggle"
                        onClick={() => setDarkMode(!darkMode)}
                        title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {darkMode ? '🌙' : '☀️'}
                        <span>{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
                    </button>

                    <div
                        className="user-menu dropdown"
                        onClick={() => setShowUserMenu(!showUserMenu)}
                    >
                        <div className="user-avatar">
                            {user?.email?.[0].toUpperCase() || 'U'}
                        </div>
                        <div className="user-info">
                            <div className="user-name">
                                {user?.email?.split('@')[0] || 'User'}
                            </div>
                            <div className="user-email">{user?.email}</div>
                        </div>
                        <span>⋮</span>

                        {showUserMenu && (
                            <div className="dropdown-menu" style={{ bottom: '100%', top: 'auto', marginBottom: '8px' }}>
                                <button className="dropdown-item danger" onClick={handleLogout}>
                                    <span>🚪</span>
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="dashboard-main">
                <header className="dashboard-header">
                    <h1 className="dashboard-title">
                        {selectedFolder
                            ? folders.find((f) => f.id === selectedFolder)?.name || 'Folder'
                            : 'All Scenes'}
                    </h1>
                    <div className="dashboard-actions">
                        <button className="btn btn-primary" onClick={handleCreateScene}>
                            ➕ New Scene
                        </button>
                    </div>
                </header>

                <div className="dashboard-content">
                    {scenesLoading ? (
                        <div className="loading-screen">
                            <div className="spinner"></div>
                        </div>
                    ) : (
                        <div className="scenes-grid">
                            {/* New Scene Card */}
                            <div className="scene-card new-scene-card" onClick={handleCreateScene}>
                                <div className="new-scene-content">
                                    <span className="new-scene-icon">➕</span>
                                    <span>Create New Scene</span>
                                </div>
                            </div>

                            {/* Scene Cards */}
                            {filteredScenes.map((scene) => (
                                <div
                                    key={scene.id}
                                    className="scene-card"
                                    onClick={() => navigate(`/editor/${scene.id}`)}
                                    onContextMenu={(e) => handleSceneContextMenu(e, scene.id)}
                                    aria-label={`Scene: ${scene.name}, ${scene.elements.length} elements`}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="scene-preview">
                                        {scene.elements.length > 0 ? '🎨' : '📄'}
                                    </div>
                                    <div className="scene-info">
                                        <div className="scene-header">
                                            {editingSceneId === scene.id ? (
                                                <input
                                                    type="text"
                                                    className="scene-name-input"
                                                    value={editingSceneName}
                                                    onChange={(e) => setEditingSceneName(e.target.value)}
                                                    onBlur={() => handleSaveSceneName(scene.id)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveSceneName(scene.id)
                                                        if (e.key === 'Escape') {
                                                            setEditingSceneId(null)
                                                            setEditingSceneName('')
                                                        }
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    autoFocus
                                                />
                                            ) : (
                                                <div className="scene-name" onDoubleClick={(e) => handleRenameScene(e, scene.id, scene.name)}>
                                                    {scene.name}
                                                </div>
                                            )}
                                            <div className="scene-actions">
                                                <button
                                                    className="scene-action-btn"
                                                    onClick={(e) => handleRenameScene(e, scene.id, scene.name)}
                                                    title="Rename Scene"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    className="scene-delete-btn"
                                                    onClick={(e) => handleDeleteScene(e, scene.id)}
                                                    title="Delete Scene"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                        <div className="scene-meta">
                                            {scene.elements.length} element{scene.elements.length !== 1 ? 's' : ''} •{' '}
                                            {formatDate(scene.updated_at)}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {filteredScenes.length === 0 && (
                                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                                    <div className="empty-icon">🎨</div>
                                    <h3 className="empty-title">No scenes yet</h3>
                                    <p className="empty-description">
                                        Create your first scene and start drawing!
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Scene Context Menu */}
            {sceneContextMenu && (
                <div
                    className="context-menu"
                    style={{ left: sceneContextMenu.x, top: sceneContextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                    role="menu"
                    aria-label="Scene actions"
                >
                    <button
                        className="dropdown-item"
                        role="menuitem"
                        onClick={() => {
                            const scene = scenes.find(s => s.id === sceneContextMenu.sceneId)
                            if (scene) handleRenameScene({ stopPropagation: () => {} } as React.MouseEvent, scene.id, scene.name)
                            setSceneContextMenu(null)
                        }}
                    >
                        <span>✏️</span>
                        <span>Rename</span>
                    </button>
                    <div className="dropdown-divider" />
                    <div className="nav-section-title" style={{ padding: '4px 12px', marginBottom: '4px' }}>
                        Move to Folder
                    </div>
                    <button
                        className="dropdown-item"
                        onClick={() => handleMoveScene(sceneContextMenu.sceneId, null)}
                    >
                        <span>🏠</span>
                        <span>All Scenes</span>
                    </button>
                    {folders.map((folder) => (
                        <button
                            key={folder.id}
                            className="dropdown-item"
                            onClick={() => handleMoveScene(sceneContextMenu.sceneId, folder.id)}
                        >
                            <span>📁</span>
                            <span>{folder.name}</span>
                        </button>
                    ))}
                    <div className="dropdown-divider" />
                    <button
                        className="dropdown-item danger"
                        onClick={() => {
                            handleDeleteScene({ stopPropagation: () => {} } as React.MouseEvent, sceneContextMenu.sceneId)
                            setSceneContextMenu(null)
                        }}
                    >
                        <span>🗑️</span>
                        <span>Delete</span>
                    </button>
                </div>
            )}

            {/* Folder Context Menu */}
            {folderContextMenu && (
                <div
                    className="context-menu"
                    style={{ left: folderContextMenu.x, top: folderContextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                    role="menu"
                    aria-label="Folder actions"
                >
                    <button
                        className="dropdown-item"
                        onClick={() => {
                            const folder = folders.find(f => f.id === folderContextMenu.folderId)
                            if (folder) handleRenameFolder({ stopPropagation: () => {} } as React.MouseEvent, folder.id, folder.name)
                            setFolderContextMenu(null)
                        }}
                    >
                        <span>✏️</span>
                        <span>Rename</span>
                    </button>
                    <button
                        className="dropdown-item danger"
                        onClick={() => {
                            handleDeleteFolder({ stopPropagation: () => {} } as React.MouseEvent, folderContextMenu.folderId)
                            setFolderContextMenu(null)
                        }}
                    >
                        <span>🗑️</span>
                        <span>Delete</span>
                    </button>
                </div>
            )}
        </div>
    )
}
