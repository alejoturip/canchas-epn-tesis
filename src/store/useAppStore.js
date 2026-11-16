/**
 * useAppStore.js
 * Estado global ligero usando Context + useReducer.
 * Si el proyecto crece, reemplaza esto por Zustand o Redux Toolkit.
 */

import { createContext, useContext, useReducer } from 'react';

const initialState = {
  notificaciones: [],   // { id, tipo: 'success'|'error'|'info', mensaje }
  carritoCount: 0,
};

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_NOTIFICACION':
      return {
        ...state,
        notificaciones: [...state.notificaciones, { id: Date.now(), ...action.payload }],
      };
    case 'REMOVE_NOTIFICACION':
      return {
        ...state,
        notificaciones: state.notificaciones.filter((n) => n.id !== action.payload),
      };
    case 'SET_CARRITO_COUNT':
      return { ...state, carritoCount: action.payload };
    default:
      return state;
  }
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const notify = (mensaje, tipo = 'info') =>
    dispatch({ type: 'ADD_NOTIFICACION', payload: { mensaje, tipo } });

  const removeNotif = (id) =>
    dispatch({ type: 'REMOVE_NOTIFICACION', payload: id });

  return (
    <AppContext.Provider value={{ state, dispatch, notify, removeNotif }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppStore = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore debe usarse dentro de <AppProvider>');
  return ctx;
};
