import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from "../../components/ui";
import { useSettingsStore, ColorScheme, FontSize, ThemeMode, Density } from "../../store/useSettingsStore";
import { Palette, Type, Moon, Sun, Monitor, CheckCircle2, RotateCcw, LayoutGrid, RefreshCw, Sparkles, GitCommit, Check } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAppUpdate } from '../../hooks/useAppUpdate';
import { toast } from 'sonner';

export function Settings() {
  const { themeMode, colorScheme, fontSize, density, fontColor, setThemeMode, setColorScheme, setFontSize, setDensity, setFontColor, reset } = useSettingsStore();
  const { 
    localVersion, 
    localBuildTime, 
    lastChecked, 
    isChecking, 
    hasUpdate, 
    checkForUpdate, 
    simulateUpdate, 
    clearSimulation, 
    refreshApp 
  } = useAppUpdate();

  const colors: { id: ColorScheme; label: string; class: string }[] = [
    { id: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { id: 'green', label: 'Green', class: 'bg-green-500' },
    { id: 'teal', label: 'Teal', class: 'bg-teal-500' },
    { id: 'violet', label: 'Violet', class: 'bg-violet-500' },
    { id: 'rose', label: 'Rose', class: 'bg-rose-500' },
    { id: 'red', label: 'Red', class: 'bg-red-500' },
    { id: 'orange', label: 'Orange', class: 'bg-orange-500' },
  ];

  const fontSizesList: { id: FontSize; label: string }[] = [
    { id: 'small', label: 'Small' },
    { id: 'medium', label: 'Medium' },
    { id: 'large', label: 'Large' },
    { id: 'xlarge', label: 'Extra Large' },
  ];

  const fontSizeIndex = fontSizesList.findIndex(fs => fs.id === fontSize);

  const modes: { id: ThemeMode; label: string; icon: any }[] = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  const densities: { id: Density; label: string; desc: string }[] = [
    { id: 'comfortable', label: 'Comfortable', desc: 'More spacing, easier to read' },
    { id: 'compact', label: 'Compact', desc: 'High density, fit more data' },
  ];

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = parseInt(e.target.value, 10);
    if (fontSizesList[newIndex]) {
      setFontSize(fontSizesList[newIndex].id);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary-600/10 p-3 rounded-full text-primary-600 dark:bg-primary-500/20 dark:text-primary-400">
            <Palette className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Appearance & Settings</h2>
            <p className="text-slate-500 dark:text-slate-400">Customize how MediTrack looks on your device.</p>
          </div>
        </div>
        
        <Button variant="outline" onClick={reset} className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />
          Reset to Default
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary-500" />
              Theme Color
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {colors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setColorScheme(color.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-2 rounded-lg border-2 transition-all w-[70px]",
                    colorScheme === color.id ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20" : "border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", color.class)}>
                    {colorScheme === color.id && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <span className="text-xs font-medium">{color.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sun className="w-5 h-5 text-primary-500" />
              Display Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setThemeMode(mode.id)}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all",
                    themeMode === mode.id 
                      ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300" 
                      : "border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700 text-slate-600 dark:text-slate-400"
                  )}
                >
                  <mode.icon className="w-6 h-6" />
                  <span className="text-sm font-medium">{mode.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Type className="w-5 h-5 text-primary-500" />
              Font Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 pt-2">
              <div className="flex items-center justify-between text-sm font-medium text-slate-600 dark:text-slate-400">
                <span>Small</span>
                <span>Medium</span>
                <span>Large</span>
                <span>Extra Large</span>
              </div>
              <input
                type="range"
                min="0"
                max={fontSizesList.length - 1}
                value={fontSizeIndex}
                onChange={handleFontSizeChange}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-primary-600"
              />
              <p className="text-sm text-slate-500 text-center">
                Currently scaling typography and UI elements to <span className="font-bold text-slate-900 dark:text-white capitalize">{fontSize}</span>.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-primary-500" />
              Layout Density
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {densities.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setDensity(item.id)}
                  className={cn(
                    "flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left",
                    density === item.id 
                      ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20" 
                      : "border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700"
                  )}
                >
                  <span className="font-bold text-slate-900 dark:text-white mb-1">{item.label}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{item.desc}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Type className="w-5 h-5 text-primary-500" />
              Custom Text Color
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={fontColor || '#0f172a'}
                onChange={(e) => setFontColor(e.target.value)}
                className="w-12 h-12 rounded cursor-pointer border-0 p-0 bg-transparent"
                title="Choose text color"
              />
              <div className="flex-1">
                <input 
                  type="text"
                  value={fontColor} 
                  onChange={(e) => setFontColor(e.target.value)}
                  placeholder="e.g. #0f172a or leave empty"
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-50 dark:focus:ring-primary-500 dark:focus:ring-offset-slate-900 font-mono"
                />
              </div>
              {fontColor && (
                <Button variant="outline" onClick={() => setFontColor('')} size="sm">
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
              Applies a custom text color globally. Leave empty to use default theme text colors.
            </p>
          </CardContent>
        </Card>

        {/* App Updates & GitHub Deployment Section */}
        <Card className="shadow-sm border-primary-200/60 dark:border-primary-900/40">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <span>Production Updates & Versioning</span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {localVersion}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              When you push commits to GitHub and deploy to your production URL, client browsers automatically check for new versions and display a refresh prompt.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/70 dark:border-slate-700/50 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Build Timestamp</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {localBuildTime ? new Date(localBuildTime).toLocaleString() : 'Development Build'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Last Checked</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {lastChecked ? lastChecked.toLocaleTimeString() : 'Checking automatically...'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isChecking}
                onClick={async () => {
                  toast.loading('Checking server for new release...', { id: 'check-update' });
                  await checkForUpdate();
                  setTimeout(() => {
                    toast.success('App is connected and checking for updates.', { id: 'check-update' });
                  }, 600);
                }}
                className="flex items-center gap-1.5"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isChecking && "animate-spin")} />
                Check for Updates
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  simulateUpdate();
                  toast.info('Simulated update notification card displayed in bottom-right corner.', {
                    duration: 4000
                  });
                }}
                className="flex items-center gap-1.5 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Test / Preview Update Card
              </Button>

              {hasUpdate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clearSimulation();
                    toast.success('Dismissed update simulation');
                  }}
                  className="text-slate-500"
                >
                  Reset Preview
                </Button>
              )}
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <span>
                Automatic polling is active (checks every 45s and instantly whenever users switch tabs).
              </span>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
