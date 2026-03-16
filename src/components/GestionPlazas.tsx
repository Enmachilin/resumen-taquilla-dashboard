"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, getDocs, where } from 'firebase/firestore';

interface Plaza {
  id: string;
  nombre: string;
}

interface GestionPlazasProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GestionPlazas({ isOpen, onClose }: GestionPlazasProps) {
  const [plazas, setPlazas] = useState<Plaza[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPlaza, setNewPlaza] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const q = query(collection(db, 'puntos_venta'), orderBy('nombre'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        nombre: doc.data().nombre
      }));
      setPlazas(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaza.trim()) return;

    try {
      await addDoc(collection(db, 'puntos_venta'), {
        nombre: newPlaza.trim(),
        fechaCreacion: new Date().toISOString()
      });
      setNewPlaza('');
    } catch (error) {
      console.error("Error al añadir plaza:", error);
      alert("Error al añadir plaza");
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      await updateDoc(doc(db, 'puntos_venta', id), {
        nombre: editingName.trim()
      });
      setEditingId(null);
    } catch (error) {
      console.error("Error al editar plaza:", error);
      alert("Error al editar");
    }
  };

  const handleDelete = async (id: string, nombre: string) => {
    setDeleting(true);
    try {
      // 1. Eliminar la plaza
      await deleteDoc(doc(db, 'puntos_venta', id));
      
      // 2. Opcional: Podríamos eliminar los registros asociados, pero el usuario dijo 
      // "mensaje de confirmación de que borrará toda la data correspondiente a esa plaza"
      // Así que buscamos registros con ese locacionId y los borramos.
      const registrosRef = collection(db, 'registros_diarios');
      const q = query(registrosRef, where('locacionId', '==', id));
      const querySnapshot = await getDocs(q);
      
      const deletePromises = querySnapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      setShowConfirmDelete(null);
    } catch (error) {
      console.error("Error al eliminar plaza y datos:", error);
      alert("Error al eliminar los datos de la plaza");
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative animate-in zoom-in duration-300">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-8 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight leading-tight">Centro de control de plazas</h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8 flex flex-col gap-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
          
          {/* Add New Plaza */}
          <form onSubmit={handleAdd} className="group">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Nueva Plaza Operativa</label>
            <div className="flex gap-3">
              <input 
                type="text" 
                placeholder="Nombre de la nueva plaza..."
                value={newPlaza}
                onChange={(e) => setNewPlaza(e.target.value)}
                className="flex-1 min-w-0 bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 focus:outline-none focus:border-indigo-600 transition-all shadow-inner"
              />
              <button 
                type="submit"
                className="bg-indigo-600 disabled:bg-gray-200 text-white min-w-[64px] rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 active:scale-95 transition-all px-4"
              >
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </form>

          {/* List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2 px-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Plazas Registradas</label>
              <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full">{plazas.length} TOTAL</span>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-4 animate-pulse">
                <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-xs font-black text-indigo-300 uppercase tracking-widest">Cargando unidades...</p>
              </div>
            ) : plazas.length === 0 ? (
              <div className="py-12 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">No hay plazas configuradas</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {plazas.map(plaza => (
                  <div 
                    key={plaza.id}
                    className={`group bg-white border-2 border-gray-50 hover:border-indigo-100 rounded-3xl px-4 transition-all hover:shadow-xl hover:shadow-indigo-50/50 relative overflow-hidden ${
                      showConfirmDelete === plaza.id ? 'py-8 min-h-[180px]' : 'py-4 flex items-center justify-between'
                    }`}
                  >
                    <div className={showConfirmDelete === plaza.id ? 'hidden' : 'flex-1'}>
                      {editingId === plaza.id ? (
                        <input
                          autoFocus
                          type="text"
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onBlur={() => handleUpdate(plaza.id)}
                          onKeyDown={e => e.key === 'Enter' && handleUpdate(plaza.id)}
                          className="w-full bg-indigo-50 border-none rounded-xl px-4 py-2 font-black text-indigo-900 outline-none"
                        />
                      ) : (
                        <div className="flex items-center gap-4 pl-2">
                          <div className="w-2.5 h-2.5 bg-green-400 rounded-full shadow-lg shadow-green-100 animate-pulse" />
                          <span className="font-extrabold text-gray-800 tracking-tight">{plaza.nombre}</span>
                        </div>
                      )}
                    </div>

                    <div className={`flex gap-1 relative ${showConfirmDelete === plaza.id ? 'hidden' : ''}`}>
                      <button
                        onClick={() => {
                          setEditingId(plaza.id);
                          setEditingName(plaza.nombre);
                        }}
                        className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      
                      <button
                        onClick={() => setMenuOpenId(menuOpenId === plaza.id ? null : plaza.id)}
                        className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>

                      {/* Tooltip menu */}
                      {menuOpenId === plaza.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setMenuOpenId(null)}
                          />
                          <div className="absolute right-0 top-12 z-20 bg-white shadow-2xl rounded-2xl border border-gray-100 p-2 min-w-[140px] animate-in zoom-in duration-200">
                            <button
                              onClick={() => {
                                setShowConfirmDelete(plaza.id);
                                setMenuOpenId(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors text-xs font-black uppercase tracking-widest"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Borrar
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Deletion Warning Overlay */}
                    {showConfirmDelete === plaza.id && (
                      <div className="absolute inset-0 bg-red-600 flex flex-col justify-center px-6 rounded-3xl animate-in slide-in-from-right duration-300 z-10">
                        <div className="mb-4">
                          <p className="text-[10px] font-black text-red-100 uppercase tracking-[0.2em] leading-none mb-2">
                            ¡Cuidado! Se borrará TODA la data vinculada
                          </p>
                          <p className="text-white font-black text-sm leading-tight">
                            ¿Eliminar permanentemente <span className="underline decoration-white/40">{plaza.nombre}</span>?
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <button 
                            disabled={deleting}
                            onClick={() => setShowConfirmDelete(null)}
                            className="flex-1 bg-white text-red-600 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] shadow-xl active:scale-95 transition-all text-center"
                          >
                            No
                          </button>
                          <button 
                            disabled={deleting}
                            onClick={() => handleDelete(plaza.id, plaza.nombre)}
                            className="flex-1 bg-red-700/50 text-white/90 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] hover:bg-red-800 transition-all border border-white/10 text-center"
                          >
                            {deleting ? '...' : 'Si, Borrar'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="h-4" /> 
      </div>
    </div>
  );
}
