// Red de seguridad de la raíz: si algo falla al pintar (o llega un error fatal al manejador global),
// en vez de cerrarse la app se enseña «Algo salió mal» con «Reintentar». Detalles solo con DEV_MENU.
import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { toCrashInfo, withComponentStack, type CrashInfo } from '@/game/crashInfo';
import { onFatalError, saveCrash } from '@/lib/crashReport';
import { DEV_MENU } from '@/lib/devMenu';
import { ErrorScreen } from '@/components/ui/ErrorScreen';

interface State {
  crash: CrashInfo | null;
  /** Cambia en cada «Reintentar» para volver a montar todo desde cero. */
  attempt: number;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { crash: null, attempt: 0 };
  private unsubscribe: (() => void) | null = null;

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { crash: toCrashInfo(error, 'render', true) };
  }

  componentDidMount(): void {
    this.unsubscribe = onFatalError((crash) => this.setState({ crash }));
  }

  componentWillUnmount(): void {
    this.unsubscribe?.();
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    const crash = withComponentStack(toCrashInfo(error, 'render', true), info.componentStack);
    saveCrash(crash);
    this.setState({ crash });
    // Si el fallo llega antes de quitar el splash, que no se quede la pantalla de carga para siempre.
    SplashScreen.hideAsync().catch(() => undefined);
  }

  private retry = () => {
    this.setState((state) => ({ crash: null, attempt: state.attempt + 1 }));
  };

  render(): ReactNode {
    if (this.state.crash) return <ErrorScreen crash={this.state.crash} showDetails={DEV_MENU} onRetry={this.retry} />;
    return <Fragment key={this.state.attempt}>{this.props.children}</Fragment>;
  }
}
