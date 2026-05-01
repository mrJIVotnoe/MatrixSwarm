export interface SystemSpecs {
  os: string;
  browser: string;
  cpuCores: number;
  memoryString: string;
  gpuRenderer: string;
  screenResolution: string;
  colorDepth: number;
  connectionType: string;
  connectionSpeed: string;
  batteryLevel: string | null;
  batteryCharging: boolean | null;
  userAgent: string;
  uptime: number;
  language: string;
  timeZone: string;
}

export async function getSystemSpecs(): Promise<SystemSpecs> {
  const specs: Partial<SystemSpecs> = {};

  specs.userAgent = navigator.userAgent;
  specs.language = navigator.language;
  specs.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  specs.cpuCores = navigator.hardwareConcurrency || 1;
  
  // @ts-ignore
  const memory = navigator.deviceMemory;
  specs.memoryString = memory ? `${memory} GB+` : 'Unknown';

  specs.screenResolution = `${window.screen.width}x${window.screen.height}`;
  specs.colorDepth = window.screen.colorDepth;

  specs.os = "Unknown OS";
  if (specs.userAgent.indexOf("Win") !== -1) specs.os = "Windows";
  if (specs.userAgent.indexOf("Mac") !== -1) specs.os = "MacOS";
  if (specs.userAgent.indexOf("X11") !== -1) specs.os = "UNIX";
  if (specs.userAgent.indexOf("Linux") !== -1) specs.os = "Linux";
  if (specs.userAgent.indexOf("Android") !== -1) specs.os = "Android";
  if (specs.userAgent.indexOf("like Mac") !== -1) specs.os = "iOS";

  specs.browser = "Unknown Browser";
  if (specs.userAgent.indexOf("Chrome") !== -1) specs.browser = "Chrome";
  else if (specs.userAgent.indexOf("Safari") !== -1) specs.browser = "Safari";
  else if (specs.userAgent.indexOf("Firefox") !== -1) specs.browser = "Firefox";

  specs.gpuRenderer = "Unknown/Software";
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        specs.gpuRenderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      }
    }
  } catch(e){}

  specs.connectionType = "Unknown";
  specs.connectionSpeed = "Unknown";
  // @ts-ignore
  const navConn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (navConn) {
    specs.connectionType = navConn.effectiveType || navConn.type || "Unknown";
    specs.connectionSpeed = navConn.downlink ? `${navConn.downlink} Mbps` : "Unknown";
  }

  specs.batteryLevel = null;
  specs.batteryCharging = null;
  // @ts-ignore
  if (navigator.getBattery) {
    try {
      // @ts-ignore
      const battery = await navigator.getBattery();
      specs.batteryLevel = `${Math.round(battery.level * 100)}%`;
      specs.batteryCharging = battery.charging;
    } catch(e){}
  }

  specs.uptime = performance.now();

  return specs as SystemSpecs;
}
