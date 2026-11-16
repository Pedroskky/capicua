// Primer import de app/_layout.tsx (expo-router carga el layout raíz antes que cualquier pantalla).
// No usar un punto de entrada propio (index.ts): en la web rompe la carga por partes de las pantallas con SkiaGate.
import { installGlobalErrorHandlers } from '@/lib/crashReport';

installGlobalErrorHandlers();
