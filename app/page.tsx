'use client';

import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);

  const [factura, setFactura] = useState('');
  const [cliente, setCliente] = useState('');
  const [telefono, setTelefono] = useState('');
  const [vendedor, setVendedor] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [correos, setCorreos] = useState('');
  const [zona, setZona] = useState('');
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
  const [tipoSolicitud, setTipoSolicitud] = useState('TOMA DE MEDIDAS');

  const [filaResaltada, setFilaResaltada] = useState<number | null>(null);
  const [historialNotificaciones, setHistorialNotificaciones] = useState<any[]>(
    []
  );
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);

  const [solicitudEditar, setSolicitudEditar] = useState<any>(null);

  const notificaciones = historialNotificaciones.filter((n) => !n.leida);

  const [solicitudOriginal, setSolicitudOriginal] = useState<any>(null);
  const [mostrarFiltroEstado, setMostrarFiltroEstado] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [mostrarFiltroFactura, setMostrarFiltroFactura] = useState(false);
  const [mostrarFiltroTelefono, setMostrarFiltroTelefono] = useState(false);
  const [mostrarFiltroVendedor, setMostrarFiltroVendedor] = useState(false);
  const [mostrarFiltroCliente, setMostrarFiltroCliente] = useState(false);
  const [mostrarFiltroZona, setMostrarFiltroZona] = useState(false);
  const [mostrarFiltroTipo, setMostrarFiltroTipo] = useState(false);

  const [mostrarFiltroFechaSolicitud, setMostrarFiltroFechaSolicitud] =
    useState(false);
  const [mostrarFiltroFechaAgendada, setMostrarFiltroFechaAgendada] =
    useState(false);
  const [mostrarFiltroAsignado, setMostrarFiltroAsignado] = useState(false);
  const [filtroFactura, setFiltroFactura] = useState('');
  const [filtroTelefono, setFiltroTelefono] = useState('');
  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroZona, setFiltroZona] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroFechaSolicitud, setFiltroFechaSolicitud] = useState('');
  const [filtroFechaAgendada, setFiltroFechaAgendada] = useState('');
  const [filtroAsignado, setFiltroAsignado] = useState('');
  const [origenMedidas, setOrigenMedidas] = useState('');
  const [mostrarFiltroOrigen, setMostrarFiltroOrigen] = useState(false);
  const [filtroOrigen, setFiltroOrigen] = useState('');

  const cargarSolicitudes = async () => {
    const { data } = await supabase
      .from('solicitudes_ventas')
      .select('*')
      .eq('eliminada', false)
      .order('id', { ascending: false });

    setSolicitudes(data || []);
  };

  const solicitudesFiltradas = solicitudes.filter((s) => {
    if (filtroFactura && s.factura !== filtroFactura) return false;
    if (filtroTelefono && s.telefono !== filtroTelefono) return false;
    if (filtroVendedor && s.vendedor !== filtroVendedor) return false;
    if (filtroCliente && s.cliente !== filtroCliente) return false;
    if (filtroZona && s.zona !== filtroZona) return false;
    if (filtroTipo && s.tipo_solicitud !== filtroTipo) return false;
    if (filtroOrigen && s.orgien_medidas !== filtroOrigen) return false;
    if (filtroEstado && s.estado !== filtroEstado) return false;
    if (
      filtroFechaSolicitud &&
      s.fecha_solicitud?.substring(0, 10) !== filtroFechaSolicitud
    )
      return false;
    if (
      filtroFechaAgendada &&
      s.fecha_agendada?.substring(0, 10) !== filtroFechaAgendada
    )
      return false;
    if (filtroAsignado && s.tecnico_asignado !== filtroAsignado) return false;
    return true;
  });

  const cargarHistorialNotificaciones = async () => {
    const { data } = await supabase
      .from('historial_notificaciones')
      .select('*')
      .order('leida', { ascending: true }) // false (no leídas) primero
      .order('fecha', { ascending: false });

    setHistorialNotificaciones(data || []);
  };

  useEffect(() => {
    cargarSolicitudes();
    cargarHistorialNotificaciones();

    const channel = supabase
      .channel('ventas-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'solicitudes_ventas',
        },
        () => {
          cargarSolicitudes();
          cargarHistorialNotificaciones();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const crearSolicitud = async () => {
    if (!factura) {
      alert('Factura requerida');
      return;
    }

    const nuevaSolicitud = {
      factura,
      cliente,
      telefono,
      vendedor,
      zona,
      tipo_solicitud: tipoSolicitud,
      observaciones,
      origen_medidas: origenMedidas,
      estado: 'PENDIENTE',
      leida_servicio: false,
      leida_ventas: true,
      fecha_solicitud: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('solicitudes_ventas')
      .insert([nuevaSolicitud]);

    if (error) {
      console.log(error);
      alert('Error al crear');
    }
    // Buscar la solicitud recién creada para obtener su ID
    const { data: solicitudCreada } = await supabase
      .from('solicitudes_ventas')
      .select('id')
      .eq('factura', factura)
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (solicitudCreada) {
      await supabase.from('historial_notificaciones').insert([
        {
          solicitud_id: solicitudCreada.id,

          cliente,

          factura,

          estado: 'NUEVA SOLICITUD',

          tipo: tipoSolicitud,

          usuario: vendedor,

          departamento: 'Ventas',

          destino: 'Servicio',

          detalle: `Se creó una nueva solicitud.\n\nTipo de solicitud: ${tipoSolicitud}`,

          fecha: new Date().toISOString(),

          leida: false,
        },
      ]);
    }

    setFactura('');
    setCliente('');
    setTelefono('');
    setVendedor('');
    setObservaciones('');
    setOrigenMedidas('');

    await cargarSolicitudes();
    supabase

      .from('solicitudes_ventas')

      .select('*');
  };
  const editarSolicitud = (solicitud: any) => {
    if (!vendedor) {
      alert('Debe seleccionar su nombre.');
      return;
    }

    const esSupervisor = vendedor === 'Maritza Abad';

    const esPropietario = vendedor === solicitud.vendedor;

    if (!esSupervisor && !esPropietario) {
      alert(
        'Solo el vendedor propietario o Maritza Abad pueden editar esta solicitud.'
      );
      return;
    }

    // Guardamos una copia ORIGINAL para comparar cambios
    setSolicitudOriginal({ ...solicitud });

    // Copia que el usuario va a editar
    setSolicitudEditar({ ...solicitud });

    setMostrarModalEditar(true);
  };
  const eliminarSolicitud = async (solicitud: any) => {
    if (!vendedor) {
      alert('Debe seleccionar su nombre.');
      return;
    }

    const esSupervisor = vendedor === 'Maritza Abad';

    const esPropietario = vendedor === solicitud.vendedor;

    if (!esSupervisor && !esPropietario) {
      alert(
        'Solo el vendedor propietario o Maritza Abad pueden eliminar esta solicitud.'
      );
      return;
    }

    if (!confirm('¿Eliminar esta solicitud?')) return;

    const { error } = await supabase
      .from('solicitudes_ventas')
      .update({
        eliminada: true,
      })
      .eq('id', solicitud.id);

    if (error) {
      alert('No se pudo eliminar.');
      return;
    }

    await supabase.from('historial_notificaciones').insert([
      {
        solicitud_id: solicitud.id,
        cliente: solicitud.cliente,
        factura: solicitud.factura,
        estado: 'ELIMINADA',
        usuario: vendedor,
        detalle:
          vendedor === 'Maritza Abad'
            ? `La supervisora Maritza Abad eliminó la solicitud.\n\nTipo de solicitud: ${solicitud.tipo_solicitud}`
            : `${vendedor} eliminó la solicitud.\n\nTipo de solicitud: ${solicitud.tipo_solicitud}`,
        fecha: new Date().toISOString(),
        leida: false,
      },
    ]);

    cargarSolicitudes();
    cargarHistorialNotificaciones();
  };

  const guardarCambios = async () => {
    if (!solicitudEditar) return;

    const original = solicitudes.find((s) => s.id === solicitudEditar.id);

    if (!original) return;

    let cambios: string[] = [];

    if (original.factura !== solicitudEditar.factura) {
      cambios.push(`Factura: ${original.factura} → ${solicitudEditar.factura}`);
    }

    if (original.telefono !== solicitudEditar.telefono) {
      cambios.push(
        `Teléfono: ${original.telefono} → ${solicitudEditar.telefono}`
      );
    }

    if (original.vendedor !== solicitudEditar.vendedor) {
      cambios.push(
        `Vendedor: ${original.vendedor} → ${solicitudEditar.vendedor}`
      );
    }

    if (original.cliente !== solicitudEditar.cliente) {
      cambios.push(`Cliente: ${original.cliente} → ${solicitudEditar.cliente}`);
    }

    if (original.zona !== solicitudEditar.zona) {
      cambios.push(`Zona: ${original.zona} → ${solicitudEditar.zona}`);
    }

    if (original.tipo_solicitud !== solicitudEditar.tipo_solicitud) {
      cambios.push(
        `Tipo: ${original.tipo_solicitud} → ${solicitudEditar.tipo_solicitud}`
      );
    }
    if (original.origen_medidas !== solicitudEditar.origen_medidas) {
      cambios.push(
        `Origen de Medidas: ${original.origenn_medidas || '-'} → ${
          solicitudEditar.origen_medidas || '-'
        }`
      );
    }

    if (original.observaciones !== solicitudEditar.observaciones) {
      cambios.push(
        `Observaciones:
  
  ANTES:
  ${original.observaciones || 'Vacío'}
  
  AHORA:
  ${solicitudEditar.observaciones || 'Vacío'}`
      );
    }

    if (cambios.length === 0) {
      alert('No realizó ningún cambio.');
      return;
    }
    const historial = cambios.map((texto) => ({
      solicitud_id: solicitudEditar.id,
      accion: 'EDITAR',
      usuario: vendedor,
      descripcion: texto,
      fecha: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from('solicitudes_ventas')
      .update({
        factura: solicitudEditar.factura,
        telefono: solicitudEditar.telefono,
        vendedor: solicitudEditar.vendedor,
        cliente: solicitudEditar.cliente,
        zona: solicitudEditar.zona,
        tipo_solicitud: solicitudEditar.tipo_solicitud,
        observaciones: solicitudEditar.observaciones,
        origen_medidas: solicitudEditar.origen_medidas,
      })
      .eq('id', solicitudEditar.id);

    if (error) {
      alert('No se pudo actualizar.');
      return;
    }

    await supabase.from('historial_notificaciones').insert([
      {
        solicitud_id: solicitudEditar.id,

        cliente: solicitudEditar.cliente,

        factura: solicitudEditar.factura,

        estado: 'SOLICITUD EDITADA',

        usuario: vendedor,

        detalle: cambios.join('\n\n'),

        fecha: new Date().toISOString(),

        leida: false,
      },
    ]);

    await supabase.from('historial_observaciones').insert(historial);

    await cargarSolicitudes();
    await cargarHistorialNotificaciones();

    setMostrarModalEditar(false);

    alert('Solicitud actualizada.');
  };
  return (
    <div
      className="
        min-h-screen
        bg-gradient-to-br
        from-slate-100
        via-blue-50
        to-cyan-50
        p-8
      "
    >
      <div className="max-w-[1450px] mx-auto">
        <div
          className="
    mb-8
    bg-gradient-to-r
    from-blue-700
    via-blue-600
    to-cyan-500
    rounded-3xl
    shadow-2xl
    px-10
    py-8
    flex
    justify-between
    items-center
  "
        >
          <div>
            <h1 className="text-5xl font-bold text-white">
              📋 Portal de Solicitudes
            </h1>

            <p className="text-blue-100 text-lg mt-2">
              Seguimiento de tomas de medidas, presupuestos y servicios
            </p>
          </div>

          <div className="relative">
            <button
              onClick={() => setMostrarNotificaciones(!mostrarNotificaciones)}
              className="
    relative
    w-14
    h-14
    rounded-2xl
    bg-white/15
    backdrop-blur-md
    border
    border-white/20
    flex
    items-center
    justify-center
    hover:bg-white/25
    hover:scale-105
    transition-all
    duration-300
  "
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="w-8 h-8 text-white"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0018 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 00-2.311 6.022 23.848 23.848 0 005.454 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                />
              </svg>

              {notificaciones.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full min-w-[24px] h-6 flex items-center justify-center shadow-lg animate-pulse">
                  {notificaciones.length}
                </span>
              )}
            </button>

            {mostrarNotificaciones && (
              <div
                className="
      absolute
      right-0
      mt-4
      w-[420px]
      max-h-[400px]
      bg-white
      rounded-2xl
      shadow-2xl
      border
      border-gray-200
      z-50
      overflow-hidden
    "
              >
                <div className="max-h-[550px] overflow-y-auto">
                  {historialNotificaciones.map((n: any) => (
                    <div
                      key={n.id}
                      className={
                        n.leida
                          ? 'p-4 border-b text-gray-400 hover:bg-gray-50 cursor-pointer transition-all'
                          : 'p-4 border-b bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500 font-semibold hover:bg-blue-100 cursor-pointer transition-all'
                      }
                      onClick={async () => {
                        const { data, error } = await supabase
                          .from('historial_notificaciones')
                          .update({
                            leida: true,
                          })
                          .eq('id', n.id)
                          .select();

                        console.log('UPDATE NOTIFICACION:', data);
                        console.log('ERROR UPDATE NOTIFICACION:', error);

                        setFilaResaltada(n.solicitud_id);

                        const fila = document.getElementById(
                          `solicitud-${n.solicitud_id}`
                        );

                        fila?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'center',
                        });

                        setTimeout(() => {
                          setFilaResaltada(null);
                        }, 3000);

                        setMostrarNotificaciones(false);

                        await cargarSolicitudes();
                        await cargarHistorialNotificaciones();
                      }}
                    >
                      <div className="font-bold text-blue-800 text-lg">
                        {n.cliente}
                      </div>

                      <div className="text-sm font-semibold text-gray-700 mt-1">
                        {n.estado}
                      </div>

                      <div className="text-xs text-gray-500">
                        {new Date(n.fecha).toLocaleString('es-DO', {
                          timeZone: 'America/Santo_Domingo',
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </div>

                      <div className="text-xs font-semibold text-blue-600 mt-2">
                        Por: {n.usuario}
                      </div>

                      {n.detalle && (
                        <div className="mt-3 rounded-lg bg-gray-100 p-3 text-xs whitespace-pre-wrap text-gray-700">
                          {n.detalle}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 flex items-center justify-center text-white text-xl shadow-lg">
              📝
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                Nueva Solicitud
              </h2>

              <p className="text-slate-500 text-sm">
                Registra una nueva gestión para el departamento de servicio al
                cliente.
              </p>
            </div>
          </div>

          <div
            className="
w-full
border
border-gray-300
rounded-xl
p-3
focus:ring-4
focus:ring-blue-200
focus:border-blue-500
outline-none
transition
"
          >
            <div className="grid grid-cols-3 gap-4">
              <input
                placeholder="Factura"
                value={factura}
                onChange={(e) => setFactura(e.target.value)}
                className="border border-gray-300 rounded-lg p-3"
              />

              <input
                placeholder="Teléfono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="border border-gray-300 rounded-lg p-3"
              />

              <select
                value={vendedor}
                onChange={(e) => setVendedor(e.target.value)}
                className="
    border
    border-gray-300
    rounded-lg
    p-3
    bg-white
    max-h-48
    overflow-y-auto
  "
              >
                <option value="">Seleccionar Vendedor</option>
                <option value="Maritza Abad">Maritza Abad</option>
                <option value="Gerardo Andiel">Gerardo Andiel</option>
                <option value="Jinnette González">Jinnette González</option>
                <option value="Ericka Hernández">Ericka Hernández</option>
                <option value="José Luis">José Luis</option>
                <option value="Kevin Manuel">Kevin Manuel</option>
              </select>

              <input
                placeholder="Cliente"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                className="border border-gray-300 rounded-lg p-3"
              />

              <input
                placeholder="Zona"
                value={zona}
                onChange={(e) => setZona(e.target.value)}
                className="border border-gray-300 rounded-lg p-3"
              />

              <select
                value={tipoSolicitud}
                onChange={(e) => setTipoSolicitud(e.target.value)}
                className="border border-gray-300 rounded-lg p-3 bg-white"
              >
                <option>TOMA DE MEDIDAS</option>
                <option>PRESUPUESTO DE TRANSPORTE</option>
                <option>PRESUPUESTO DE TRANSPORTE E INSTALACION</option>
                <option>PRESUPUESTO DE INSTALACION</option>
                <option>CHEQUE DE PROMOCION</option>
                <option>CASO</option>
                <option>OTRO</option>
              </select>
              <select
                value={origenMedidas}
                onChange={(e) => setOrigenMedidas(e.target.value)}
                className="border border-gray-300 rounded-lg p-3 bg-white"
              >
                <option value="">Origen de las medidas</option>
                <option value="IKEA">IKEA</option>
                <option value="CLIENTE">CLIENTE</option>
              </select>
            </div>
          </div>

          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Observaciones"
            className="border p-2 w-full mt-4"
          />

          <button
            onClick={crearSolicitud}
            className="
     bg-gradient-to-r
     from-blue-600
     to-cyan-500
     text-white
     font-bold
     px-8
     py-3
     mt-6
     rounded-xl
     shadow-lg
     hover:scale-105
     hover:shadow-2xl
     transition-all
     duration-300
     "
          >
            Enviar Solicitud
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden mt-8">
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
            <h2 className="text-white text-xl font-bold">📋 Mis Solicitudes</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-4 text-left relative">
                    {' '}
                    <div className="flex items-center gap-1">
                      {' '}
                      Factura{' '}
                      <button
                        onClick={() =>
                          setMostrarFiltroFactura(!mostrarFiltroFactura)
                        }
                        className="text-xs"
                      >
                        {' '}
                        ▼{' '}
                      </button>{' '}
                    </div>{' '}
                    {mostrarFiltroFactura && (
                      <div className="absolute z-50 mt-2 w-52 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {' '}
                        <button
                          className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                          onClick={() => {
                            setFiltroFactura('');
                            setMostrarFiltroFactura(false);
                          }}
                        >
                          {' '}
                          Todas{' '}
                        </button>{' '}
                        {solicitudes
                          .map((s) => s.factura)
                          .filter(
                            (factura, index, self) =>
                              factura && self.indexOf(factura) === index
                          )
                          .sort()
                          .map((f) => (
                            <button
                              key={f}
                              className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                              onClick={() => {
                                setFiltroFactura(f);
                                setMostrarFiltroFactura(false);
                              }}
                            >
                              {' '}
                              {f}{' '}
                            </button>
                          ))}{' '}
                      </div>
                    )}{' '}
                  </th>{' '}
                  <th className="px-4 py-4 text-left relative">
                    {' '}
                    <div className="flex items-center gap-1">
                      {' '}
                      Teléfono{' '}
                      <button
                        onClick={() =>
                          setMostrarFiltroTelefono(!mostrarFiltroTelefono)
                        }
                        className="text-xs"
                      >
                        {' '}
                        ▼{' '}
                      </button>{' '}
                    </div>{' '}
                    {mostrarFiltroTelefono && (
                      <div className="absolute z-50 mt-2 w-52 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {' '}
                        <button
                          className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                          onClick={() => {
                            setFiltroTelefono('');
                            setMostrarFiltroTelefono(false);
                          }}
                        >
                          {' '}
                          Todos{' '}
                        </button>{' '}
                        {solicitudes
                          .map((s) => s.telefono)
                          .filter((v, i, self) => v && self.indexOf(v) === i)
                          .sort()
                          .map((f) => (
                            <button
                              key={f}
                              className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                              onClick={() => {
                                setFiltroTelefono(f);
                                setMostrarFiltroTelefono(false);
                              }}
                            >
                              {' '}
                              {f}{' '}
                            </button>
                          ))}{' '}
                      </div>
                    )}{' '}
                  </th>{' '}
                  <th className="px-4 py-4 text-left relative">
                    {' '}
                    <div className="flex items-center gap-1">
                      {' '}
                      Vendedor{' '}
                      <button
                        onClick={() =>
                          setMostrarFiltroVendedor(!mostrarFiltroVendedor)
                        }
                        className="text-xs"
                      >
                        {' '}
                        ▼{' '}
                      </button>{' '}
                    </div>{' '}
                    {mostrarFiltroVendedor && (
                      <div className="absolute z-50 mt-2 w-60 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {' '}
                        <button
                          className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                          onClick={() => {
                            setFiltroVendedor('');
                            setMostrarFiltroVendedor(false);
                          }}
                        >
                          {' '}
                          Todos{' '}
                        </button>{' '}
                        {solicitudes
                          .map((s) => s.vendedor)
                          .filter((v, i, self) => v && self.indexOf(v) === i)
                          .sort()
                          .map((f) => (
                            <button
                              key={f}
                              className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                              onClick={() => {
                                setFiltroVendedor(f);
                                setMostrarFiltroVendedor(false);
                              }}
                            >
                              {' '}
                              {f}{' '}
                            </button>
                          ))}{' '}
                      </div>
                    )}{' '}
                  </th>{' '}
                  <th className="px-4 py-4 text-left relative">
                    {' '}
                    <div className="flex items-center gap-1">
                      {' '}
                      Cliente{' '}
                      <button
                        onClick={() =>
                          setMostrarFiltroCliente(!mostrarFiltroCliente)
                        }
                        className="text-xs"
                      >
                        {' '}
                        ▼{' '}
                      </button>{' '}
                    </div>{' '}
                    {mostrarFiltroCliente && (
                      <div className="absolute z-50 mt-2 w-60 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {' '}
                        <button
                          className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                          onClick={() => {
                            setFiltroCliente('');
                            setMostrarFiltroCliente(false);
                          }}
                        >
                          {' '}
                          Todos{' '}
                        </button>{' '}
                        {solicitudes
                          .map((s) => s.cliente)
                          .filter((v, i, self) => v && self.indexOf(v) === i)
                          .sort()
                          .map((f) => (
                            <button
                              key={f}
                              className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                              onClick={() => {
                                setFiltroCliente(f);
                                setMostrarFiltroCliente(false);
                              }}
                            >
                              {' '}
                              {f}{' '}
                            </button>
                          ))}{' '}
                      </div>
                    )}{' '}
                  </th>{' '}
                  <th className="px-4 py-4 text-left relative">
                    {' '}
                    <div className="flex items-center gap-1">
                      {' '}
                      Zona{' '}
                      <button
                        onClick={() => setMostrarFiltroZona(!mostrarFiltroZona)}
                        className="text-xs"
                      >
                        {' '}
                        ▼{' '}
                      </button>{' '}
                    </div>{' '}
                    {mostrarFiltroZona && (
                      <div className="absolute z-50 mt-2 w-52 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {' '}
                        <button
                          className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                          onClick={() => {
                            setFiltroZona('');
                            setMostrarFiltroZona(false);
                          }}
                        >
                          {' '}
                          Todas{' '}
                        </button>{' '}
                        {solicitudes
                          .map((s) => s.zona)
                          .filter((v, i, self) => v && self.indexOf(v) === i)
                          .sort()
                          .map((f) => (
                            <button
                              key={f}
                              className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                              onClick={() => {
                                setFiltroZona(f);
                                setMostrarFiltroZona(false);
                              }}
                            >
                              {' '}
                              {f}{' '}
                            </button>
                          ))}{' '}
                      </div>
                    )}{' '}
                  </th>
                  <th className="px-4 py-4 text-left relative">
                    <div className="flex items-center gap-1">
                      Tipo
                      <button
                        onClick={() => setMostrarFiltroTipo(!mostrarFiltroTipo)}
                        className="text-xs"
                      >
                        ▼
                      </button>
                    </div>

                    {mostrarFiltroTipo && (
                      <div className="absolute z-50 mt-2 w-64 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <button
                          className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                          onClick={() => {
                            setFiltroTipo('');
                            setMostrarFiltroTipo(false);
                          }}
                        >
                          Todos
                        </button>

                        {solicitudes
                          .map((s) => s.tipo_solicitud)
                          .filter((v, i, self) => v && self.indexOf(v) === i)
                          .sort()
                          .map((tipo) => (
                            <button
                              key={tipo}
                              className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                              onClick={() => {
                                setFiltroTipo(tipo);
                                setMostrarFiltroTipo(false);
                              }}
                            >
                              {tipo}
                            </button>
                          ))}
                      </div>
                    )}
                  </th>
                  <th className="px-4 py-4 text-center">Observaciones</th>
                  <th className="px-4 py-4 text-left relative">
                    <div className="flex items-center gap-1">
                      Origen Medidas
                      <button
                        onClick={() =>
                          setMostrarFiltroOrigen(!mostrarFiltroOrigen)
                        }
                        className="text-xs"
                      >
                        ▼
                      </button>
                    </div>

                    {mostrarFiltroOrigen && (
                      <div className="absolute top-full left-0 mt-2 w-52 bg-white rounded-xl shadow-xl border z-50">
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"
                          onClick={() => {
                            setFiltroOrigen('');
                            setMostrarFiltroOrigen(false);
                          }}
                        >
                          Todos
                        </button>

                        <button
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"
                          onClick={() => {
                            setFiltroOrigen('IKEA');
                            setMostrarFiltroOrigen(false);
                          }}
                        >
                          IKEA
                        </button>

                        <button
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"
                          onClick={() => {
                            setFiltroOrigen('CLIENTE');
                            setMostrarFiltroOrigen(false);
                          }}
                        >
                          CLIENTE
                        </button>
                      </div>
                    )}
                  </th>
                  <th className="px-4 py-4 text-center relative">
                    {' '}
                    <div className="flex items-center gap-2">
                      {' '}
                      <span>Estado</span>{' '}
                      <button
                        type="button"
                        onClick={() =>
                          setMostrarFiltroEstado(!mostrarFiltroEstado)
                        }
                        className="text-xs hover:text-blue-600"
                      >
                        {' '}
                        ▼{' '}
                      </button>{' '}
                    </div>{' '}
                    {mostrarFiltroEstado && (
                      <div className=" absolute top-full left-0 mt-2 w-52 bg-white rounded-xl shadow-xl border z-50 ">
                        {' '}
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"
                          onClick={() => {
                            setFiltroEstado('');
                            setMostrarFiltroEstado(false);
                          }}
                        >
                          {' '}
                          Todos{' '}
                        </button>{' '}
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"
                          onClick={() => {
                            setFiltroEstado('PENDIENTE');
                            setMostrarFiltroEstado(false);
                          }}
                        >
                          {' '}
                          Pendiente{' '}
                        </button>{' '}
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"
                          onClick={() => {
                            setFiltroEstado('EN PROCESO');
                            setMostrarFiltroEstado(false);
                          }}
                        >
                          {' '}
                          En proceso{' '}
                        </button>{' '}
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"
                          onClick={() => {
                            setFiltroEstado('AGENDADA');
                            setMostrarFiltroEstado(false);
                          }}
                        >
                          {' '}
                          Agendada{' '}
                        </button>{' '}
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"
                          onClick={() => {
                            setFiltroEstado('COMPLETADA');
                            setMostrarFiltroEstado(false);
                          }}
                        >
                          {' '}
                          Completada{' '}
                        </button>{' '}
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"
                          onClick={() => {
                            setFiltroEstado('CANCELADA');
                            setMostrarFiltroEstado(false);
                          }}
                        >
                          Cancelada
                        </button>
                      </div>
                    )}{' '}
                  </th>
                  <th className="px-4 py-4 text-left relative">
                    <div className="flex items-center gap-1">
                      Fecha Solicitud
                      <button
                        onClick={() =>
                          setMostrarFiltroFechaSolicitud(
                            !mostrarFiltroFechaSolicitud
                          )
                        }
                        className="text-xs"
                      >
                        ▼
                      </button>
                    </div>

                    {mostrarFiltroFechaSolicitud && (
                      <div className="absolute z-50 mt-2 w-56 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <button
                          className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                          onClick={() => {
                            setFiltroFechaSolicitud('');
                            setMostrarFiltroFechaSolicitud(false);
                          }}
                        >
                          Todas
                        </button>

                        {solicitudes
                          .map((s) => s.fecha_solicitud?.substring(0, 10))
                          .filter((v, i, self) => v && self.indexOf(v) === i)
                          .sort()
                          .map((fecha) => (
                            <button
                              key={fecha}
                              className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                              onClick={() => {
                                setFiltroFechaSolicitud(fecha);
                                setMostrarFiltroFechaSolicitud(false);
                              }}
                            >
                              {fecha}
                            </button>
                          ))}
                      </div>
                    )}
                  </th>
                  <th className="px-4 py-4 text-center relative">
                    <div className="flex justify-center items-center gap-1">
                      <span>Fecha Agendada/Respuesta</span>

                      <button
                        type="button"
                        onClick={() =>
                          setMostrarFiltroFechaAgendada(
                            !mostrarFiltroFechaAgendada
                          )
                        }
                        className="text-xs hover:text-blue-600"
                      >
                        ▼
                      </button>
                    </div>

                    {mostrarFiltroFechaAgendada && (
                      <div className="absolute z-50 mt-2 w-56 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <button
                          className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                          onClick={() => {
                            setFiltroFechaAgendada('');
                            setMostrarFiltroFechaAgendada(false);
                          }}
                        >
                          Todas
                        </button>

                        {solicitudes
                          .map((s) => s.fecha_agendada?.substring(0, 10))
                          .filter((v, i, self) => v && self.indexOf(v) === i)
                          .sort()
                          .map((fecha) => (
                            <button
                              key={fecha}
                              className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                              onClick={() => {
                                setFiltroFechaAgendada(fecha);
                                setMostrarFiltroFechaAgendada(false);
                              }}
                            >
                              {fecha}
                            </button>
                          ))}
                      </div>
                    )}
                  </th>
                  <th className="px-4 py-4 text-center relative">
                    <div className="flex justify-center items-center gap-1">
                      Asignado
                      <button
                        onClick={() =>
                          setMostrarFiltroAsignado(!mostrarFiltroAsignado)
                        }
                        className="text-xs"
                      >
                        ▼
                      </button>
                    </div>

                    {mostrarFiltroAsignado && (
                      <div className="absolute z-50 mt-2 w-56 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <button
                          className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                          onClick={() => {
                            setFiltroAsignado('');
                            setMostrarFiltroAsignado(false);
                          }}
                        >
                          Todos
                        </button>

                        {solicitudes
                          .map((s) => s.tecnico_asignado)
                          .filter((v, i, self) => v && self.indexOf(v) === i)
                          .sort()
                          .map((persona) => (
                            <button
                              key={persona}
                              className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                              onClick={() => {
                                setFiltroAsignado(persona);
                                setMostrarFiltroAsignado(false);
                              }}
                            >
                              {persona}
                            </button>
                          ))}
                      </div>
                    )}
                  </th>
                  <th className="px-4 py-4 text-center">PDF</th>
                  <th className="px-4 py-4 text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {solicitudesFiltradas.map((s: any) => (
                  <tr
                    key={s.id}
                    id={`solicitud-${s.id}`}
                    className={
                      filaResaltada === s.id
                        ? 'bg-yellow-100 transition-all duration-500'
                        : 'hover:bg-blue-50 transition-all duration-300'
                    }
                  >
                    <td className="px-4 py-4 border-t border-gray-100">
                      <span className="font-bold text-slate-800">
                        {s.factura}
                      </span>
                    </td>

                    <td className="px-4 py-4 border-t border-gray-100">
                      {s.telefono || '-'}
                    </td>

                    <td className="px-4 py-4 border-t border-gray-100">
                      {s.vendedor}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="font-semibold text-slate-800">
                        {s.cliente}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center">{s.zona}</td>

                    <td className="px-4 py-3 text-center">
                      {s.tipo_solicitud}
                    </td>

                    <td
                      className="px-4 py-4 border-t border-gray-100 max-w-xs truncate"
                      title={s.observaciones}
                    >
                      {s.observaciones || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.origen_medidas || '-'}
                    </td>

                    <td className="px-4 py-4 border-t border-gray-100">
                      <span
                        className={
                          s.estado === 'COMPLETADA'
                            ? 'bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold'
                            : s.estado === 'AGENDADA'
                            ? 'bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold'
                            : s.estado === 'EN PROCESO'
                            ? 'bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-semibold'
                            : s.estado === 'CANCELADA'
                            ? 'bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold'
                            : 'bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-semibold'
                        }
                      >
                        {s.estado}
                      </span>
                    </td>

                    <td className="text-center align-middle">
                      {s.fecha_solicitud ? (
                        <>
                          {new Date(s.fecha_solicitud).toLocaleDateString(
                            'es-DO'
                          )}
                          <br />
                          <span className="text-xs text-gray-500">
                            {new Date(s.fecha_solicitud).toLocaleTimeString(
                              'es-DO',
                              {
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </span>
                        </>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="text-center align-middle">
                      {s.fecha_agendada ? (
                        <>
                          {new Date(s.fecha_agendada).toLocaleDateString(
                            'es-DO',
                            {
                              timeZone: 'America/Santo_Domingo',
                            }
                          )}
                          <br />
                          <span className="text-xs text-gray-500">
                            {s.fecha_ultima_modificacion
                              ? new Intl.DateTimeFormat('es-DO', {
                                  timeZone: 'America/Santo_Domingo',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                }).format(new Date(s.fecha_ultima_modificacion))
                              : '-'}
                          </span>
                        </>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {s.tecnico_asignado || '-'}
                    </td>

                    <td className="px-4 py-4 border-t border-gray-100">
                      {s.pdf_informe ? (
                        <a
                          href={s.pdf_informe}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="
              inline-flex
              items-center
              gap-2
              bg-blue-100
              text-blue-700
              px-3
              py-2
              rounded-lg
              font-semibold
              hover:bg-blue-200
              transition
            "
                        >
                          📄 PDF
                        </a>
                      ) : (
                        <span className="text-gray-400">Pendiente</span>
                      )}
                    </td>

                    <td className="py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => editarSolicitud(s)}
                          title="Editar"
                          className="
              w-10 h-10
              rounded-xl
              bg-white
              border border-slate-200
              shadow-sm
              hover:shadow-md
              hover:border-slate-300
              active:scale-95
              transition-all
              duration-200
              flex items-center justify-center
            "
                        >
                          <PencilSquareIcon className="w-5 h-5 text-slate-700" />
                        </button>

                        <button
                          onClick={() => eliminarSolicitud(s)}
                          title="Eliminar"
                          className="
              w-10 h-10
              rounded-xl
              bg-white
              border border-slate-200
              shadow-sm
              hover:shadow-md
              hover:border-slate-300
              active:scale-95
              transition-all
              duration-200
              flex items-center justify-center
            "
                        >
                          <TrashIcon className="w-5 h-5 text-slate-700" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {mostrarModalEditar && solicitudEditar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Editar Solicitud</h2>

              <button
                onClick={() => setMostrarModalEditar(false)}
                className="text-3xl hover:text-red-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="font-semibold mb-2 block">Factura</label>

                <input
                  value={solicitudEditar.factura}
                  onChange={(e) =>
                    setSolicitudEditar({
                      ...solicitudEditar,
                      factura: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-3"
                />
              </div>

              <div>
                <label className="font-semibold mb-2 block">Teléfono</label>

                <input
                  value={solicitudEditar.telefono}
                  onChange={(e) =>
                    setSolicitudEditar({
                      ...solicitudEditar,
                      telefono: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-3"
                />
              </div>

              <div>
                <label className="font-semibold mb-2 block">Vendedor</label>

                <select
                  value={solicitudEditar.vendedor}
                  onChange={(e) =>
                    setSolicitudEditar({
                      ...solicitudEditar,
                      vendedor: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-3"
                >
                  <option value="">Seleccionar</option>
                  <option value="Gerardo Andiel">Gerardo Andiel</option>
                  <option value="Jinnette González">Jinnette González</option>
                  <option value="Ericka Hernández">Ericka Hernández</option>
                  <option value="José Luis">José Luis</option>
                  <option value="Kevin Manuel">Kevin Manuel</option>
                </select>
              </div>

              <div>
                <label className="font-semibold mb-2 block">Cliente</label>

                <input
                  value={solicitudEditar.cliente}
                  onChange={(e) =>
                    setSolicitudEditar({
                      ...solicitudEditar,
                      cliente: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-3"
                />
              </div>

              <div>
                <label className="font-semibold mb-2 block">Zona</label>

                <input
                  value={solicitudEditar.zona}
                  onChange={(e) =>
                    setSolicitudEditar({
                      ...solicitudEditar,
                      zona: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-3"
                />
              </div>

              <div>
                <label className="font-semibold mb-2 block">
                  Tipo de Solicitud
                </label>

                <select
                  value={solicitudEditar.tipo_solicitud}
                  onChange={(e) =>
                    setSolicitudEditar({
                      ...solicitudEditar,
                      tipo_solicitud: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-3"
                >
                  <option>TOMA DE MEDIDAS</option>
                  <option>PRESUPUESTO DE TRANSPORTE</option>
                  <option>PRESUPUESTO DE TRANSPORTE E INSTALACION</option>
                  <option>PRESUPUESTO DE INSTALACION</option>
                  <option>CHEQUE DE PROMOCION</option>
                  <option>OTRO</option>
                </select>
              </div>
              <div>
                <label className="font-semibold mb-2 block">
                  Origen de las Medidas
                </label>

                <select
                  value={solicitudEditar.origen_medidas || ''}
                  onChange={(e) =>
                    setSolicitudEditar({
                      ...solicitudEditar,
                      origen_medidas: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-3"
                >
                  <option value="">Seleccionar</option>
                  <option value="IKEA">IKEA</option>
                  <option value="CLIENTE">CLIENTE</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="font-semibold block mb-2">Observaciones</label>

              <textarea
                rows={6}
                value={solicitudEditar.observaciones}
                onChange={(e) =>
                  setSolicitudEditar({
                    ...solicitudEditar,
                    observaciones: e.target.value,
                  })
                }
                className="w-full border rounded-xl p-3"
              />
            </div>

            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={() => setMostrarModalEditar(false)}
                className="bg-gray-300 hover:bg-gray-400 px-6 py-3 rounded-xl font-semibold"
              >
                Cancelar
              </button>

              <button
                onClick={guardarCambios}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
