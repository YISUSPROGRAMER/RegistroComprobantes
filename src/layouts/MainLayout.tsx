import React, { useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { BarChart3, FileText, Users } from 'lucide-react';
import clsx from 'clsx';
import { SyncService } from '../services/sync';

export const MainLayout: React.FC = () => {
    const location = useLocation();

    const navItems = [
        { path: '/comprobantes', icon: FileText, label: 'Comprobantes' },
        { path: '/estadisticas', icon: BarChart3, label: 'Estadísticas' },
        { path: '/terceros', icon: Users, label: 'Terceros' }
    ];

    useEffect(() => {
        const runAutoSync = (notifyUser = false) => {
            SyncService.autoSync({ minIntervalMs: 10000, notifyUser }).catch((error) => {
                console.error('[AutoSync] Error:', error);
            });
        };

        runAutoSync(true);

        const intervalId = window.setInterval(() => runAutoSync(), 60000);
        const onFocus = () => runAutoSync(true);
        const onOnline = () => runAutoSync(true);
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') runAutoSync(true);
        };

        window.addEventListener('focus', onFocus);
        window.addEventListener('online', onOnline);
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', onFocus);
            window.removeEventListener('online', onOnline);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, []);

    return (
        <div className="h-[100dvh] bg-slate-50 text-slate-900">
            <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur lg:bottom-auto lg:top-0 lg:h-full lg:w-64 lg:border-r lg:border-t-0 lg:bg-white">
                <div className="hidden h-16 items-center border-b border-slate-200 px-5 lg:flex">
                    <h2 className="text-base font-extrabold tracking-tight text-slate-900">Registro Comprobantes</h2>
                </div>

                <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-around lg:h-auto lg:max-w-none lg:flex-col lg:items-stretch lg:gap-1 lg:px-3 lg:py-4">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={clsx(
                                    'flex h-full w-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors lg:h-auto lg:flex-row lg:justify-start lg:gap-3 lg:rounded-xl lg:px-3 lg:py-2.5 lg:text-sm',
                                    isActive ? 'text-cyan-700 lg:bg-cyan-50' : 'text-slate-500 hover:text-slate-700 lg:hover:bg-slate-100'
                                )}
                            >
                                <Icon size={20} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            <main className="mx-auto h-full w-full max-w-[1700px] overflow-hidden px-4 pb-24 pt-4 sm:px-6 lg:pb-6 lg:pl-72 lg:pr-8 lg:pt-6">
                <Outlet />
            </main>
        </div>
    );
};
