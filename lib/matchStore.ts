// Partida en curso (clave `capicua.match`, con versión de esquema en game/savedMatch.ts).
// Se guarda tras cada jugada y al mandar la app al fondo; sin almacenamiento el juego sigue igual.
import { normalizeSavedMatch, type SavedMatch } from '@/game/savedMatch';
import { createStoredValue } from '@/lib/storedValue';

export const matchStore = createStoredValue<SavedMatch | null>('capicua.match', null, normalizeSavedMatch);
