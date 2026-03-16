"use client";

import { useState, useEffect } from "react";
import RegistroForm from "@/components/RegistroForm";
import ComparativaView from "@/components/ComparativaView";
import GestionPlazas from "@/components/GestionPlazas";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, getDocs, setDoc, doc } from "firebase/firestore";
import { RegistroDiario } from "@/types";
import { PushNotifications } from '@capacitor/push-notifications';

export default function Home() {
  // 1. Determinar el modo de la aplicación PRIMERO (limpiando posibles espacios de Windows)
  const rawMode = process.env.NEXT_PUBLIC_APP_MODE || "";
  const appMode = rawMode.trim().toLowerCase();
  
  const isRegistrarOnly = appMode === "registrar";
  const isAnaliticaOnly = appMode === "analitica";
  const isFullMode = !isRegistrarOnly && !isAnaliticaOnly;

  // 2. Inicializar estados con valores derivados del modo
  const [view, setView] = useState<"admin" | "comparativa">(isRegistrarOnly ? "admin" : "comparativa");
  const [isMounted, setIsMounted] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isPlazasOpen, setIsPlazasOpen] = useState(false);
  const [newRecordAlert, setNewRecordAlert] = useState<RegistroDiario | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [mountTime] = useState(Date.now());

  useEffect(() => {
    setIsMounted(true);
    
    // 3. Configurar Notificaciones Push Reales (Solo para Admin/Analitica en dispositivos nativos)
    if (!isRegistrarOnly) {
      const setupPush = async () => {
        try {
          // Solicitar permiso
          let perm = await PushNotifications.checkPermissions();
          if (perm.receive !== 'granted') {
            perm = await PushNotifications.requestPermissions();
          }

          if (perm.receive === 'granted') {
            // Registrar para notificaciones
            await PushNotifications.register();

            // Guardar el token en Firestore para que las Cloud Functions sepan a quién enviárselo
            await PushNotifications.addListener('registration', async (token) => {
              console.log('Push registration success, token: ' + token.value);
              // Guardamos el token en una colección de "dispositivos_admin"
              await setDoc(doc(db, "dispositivos_admin", token.value), {
                token: token.value,
                ultimoUso: new Date().toISOString(),
                nombre: "Admin Android"
              });
            });

            // Manejar errores de registro
            await PushNotifications.addListener('registrationError', (error) => {
              console.error('Error on registration: ' + JSON.stringify(error));
            });

            // Acción al recibir la notificación estando la app abierta (opcional)
            await PushNotifications.addListener('pushNotificationReceived', (notification) => {
              console.log('Push received: ' + JSON.stringify(notification));
              if (notification.data?.registroId) {
                 setNewRecordAlert({ 
                   id: notification.data.registroId, 
                   locacionId: notification.data.locacionId || 'nueva-plaza',
                   tickets: parseInt(notification.data.tickets) || 0,
                   fecha: new Date().toLocaleDateString(),
                   totalCalculado: 0,
                   tasaDolar: 0,
                   status: 'operativo'
                 } as any);
              }
            });
          }
        } catch (e) {
          console.warn("Notificaciones Push no iniciadas (posiblemente en Web):", e);
          
          // Fallback para navegador web (solicitar permiso web estándar)
          if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
          }
        }
      };

      setupPush();
    }

    // Escuchar el último registro creado (Web/Local Feedback)
    const q = query(
      collection(db, "registros_diarios"),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      // Solo mostramos alerta visual si la app está abierta. 
      // La notificación real del sistema vendrá por Cloud Functions.
      if (!snapshot.empty && !isRegistrarOnly) {
        const latestDoc = snapshot.docs[0].data() as RegistroDiario;
        const recordId = snapshot.docs[0].id;
        
        if (latestDoc.createdAt && (latestDoc.createdAt as any).toMillis() > mountTime) {
            setNewRecordAlert({ ...latestDoc, id: recordId });
            if ('vibrate' in navigator) navigator.vibrate(200);
        }
      }
    });

    return () => unsub();
  }, [isRegistrarOnly, isAnaliticaOnly, mountTime]);

  const handleNotificationClick = () => {
    if (newRecordAlert) {
      setHighlightedId(newRecordAlert.id);
      setView("comparativa");
      setNewRecordAlert(null);
    }
  };

  if (!isMounted) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#F9FAFB]">
        <div className="relative">
          {/* Spinner Exterior */}
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin shadow-sm"></div>
          {/* Punto Central con Pulso */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping"></div>
          </div>
        </div>
        <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-2 duration-700">
          <h2 className="text-2xl font-black text-indigo-950 tracking-tighter uppercase">
            Data<span className="text-indigo-600">Park</span>
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-2">
            Iniciando Sistema
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="h-screen bg-gray-50 text-gray-900 overflow-hidden flex flex-col">

      {/* Header */}
      <header className="bg-white px-6 py-4 shadow-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1
            className="text-xl font-extrabold tracking-tight text-indigo-900 uppercase"
          >
            Data<span className="text-indigo-600">Park</span>
          </h1>

           {isFullMode && (
            <div className="flex bg-gray-100 p-1 rounded-xl relative w-36 sm:w-64 shadow-inner border border-gray-100">
              {/* Indicador de fondo animado */}
              <div 
                className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-in-out ${
                  view === "comparativa" ? "translate-x-0" : "translate-x-[calc(100%+4px)]"
                }`}
              />
              <button
                onClick={() => setView("comparativa")}
                className={`relative flex-1 py-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-colors z-10 flex items-center justify-center gap-1.5 ${
                  view === "comparativa" ? "text-indigo-600" : "text-gray-400 opacity-60 hover:opacity-100"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                <span className="hidden sm:inline">Admin</span>
              </button>
              <button
                onClick={() => setView("admin")}
                className={`relative flex-1 py-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-colors z-10 flex items-center justify-center gap-1.5 ${
                  view === "admin" ? "text-indigo-600" : "text-gray-400 opacity-60 hover:opacity-100"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="hidden sm:inline">Reportar</span>
              </button>
            </div>
          )}

          {/* Grupo de botones derecha */}
          <div className="flex items-center gap-2">
            {newRecordAlert && !isRegistrarOnly && (
              <button
                onClick={handleNotificationClick}
                className="relative w-10 h-10 flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 rounded-full transition-all group border border-indigo-100 shadow-sm"
              >
                <div className="relative">
                  <svg className="w-5 h-5 text-indigo-600 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 22a2 2 0 002-2h-4a2 2 0 002 2zm6-6V10a6 6 0 00-9-5.17V4a1 1 0 00-2 0v.83A6 6 0 006 10v6l-2 2v1h16v-1l-2-2z" />
                  </svg>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                </div>
              </button>
            )}

            {(isAnaliticaOnly || isFullMode) && (
              <button
                  onClick={() => setIsPlazasOpen(true)}
                  className="w-10 h-10 flex flex-col items-center justify-center gap-0.5 hover:bg-gray-100 rounded-full transition-all border-2 border-transparent active:border-indigo-100"
              >
                  <div className="w-1 h-1 bg-indigo-900 rounded-full"></div>
                  <div className="w-1 h-1 bg-indigo-900 rounded-full"></div>
                  <div className="w-1 h-1 bg-indigo-900 rounded-full"></div>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-2 md:px-4 py-2 min-h-0 overflow-y-auto">
        {errorStatus && (
          <div className="mt-8 p-4 bg-red-50 border-2 border-red-100 rounded-2xl text-red-600 text-sm font-bold flex items-start gap-3 animate-bounce">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="uppercase tracking-tight">ERROR: {errorStatus}</p>
              <p className="mt-1 text-xs font-normal opacity-80">Verifica las variables de entorno NEXT_PUBLIC.</p>
            </div>
          </div>
        )}

        {view === "admin" && !isAnaliticaOnly && (
          <div className="h-full animate-in fade-in duration-300">
            <RegistroForm />
          </div>
        )}

        {view === "comparativa" && !isRegistrarOnly && (
          <ComparativaView 
            highlightedId={highlightedId} 
            onClearHighlight={() => setHighlightedId(null)}
          />
        )}

      </div>


      {!isRegistrarOnly && (
        <GestionPlazas isOpen={isPlazasOpen} onClose={() => setIsPlazasOpen(false)} />
      )}
    </main>
  );
}
