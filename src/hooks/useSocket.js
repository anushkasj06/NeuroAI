/**
 * useSocket — general-purpose hook for emitting events and subscribing
 * to server responses.
 *
 * Example:
 *   const { emit, on, connected } = useSocket();
 *   useEffect(() => on('room:created', handler), [on]);
 *   const handleCreate = () => emit('room:create', {});
 */
import { useSocketContext } from '../context/SocketContext';

export const useSocket = () => {
  const { socket, connected, socketId, error, emit, on, addLog } = useSocketContext();
  return { socket, connected, socketId, error, emit, on, addLog };
};

export default useSocket;
