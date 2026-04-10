package main

import (
	"fmt"
	"log"
	"net"
	"os/exec"
	"runtime"
)

// SetSystemProxy enables the local SOCKS5 proxy in system settings
func SetSystemProxy(addr string) error {
	log.Printf("[E.S.C.A.P.E. SysProxy] Attempting to set system proxy to %s...", addr)
	
	switch runtime.GOOS {
	case "windows":
		return setWindowsProxy(addr)
	case "darwin":
		return setMacOSProxy(addr)
	case "linux":
		return setLinuxProxy(addr)
	default:
		return fmt.Errorf("unsupported platform: %s", runtime.GOOS)
	}
}

// UnsetSystemProxy disables the system proxy
func UnsetSystemProxy() error {
	log.Println("[E.S.C.A.P.E. SysProxy] Disabling system proxy...")
	
	switch runtime.GOOS {
	case "windows":
		return unsetWindowsProxy()
	case "darwin":
		return unsetMacOSProxy()
	case "linux":
		return unsetLinuxProxy()
	default:
		return fmt.Errorf("unsupported platform: %s", runtime.GOOS)
	}
}

func setWindowsProxy(addr string) error {
	// Using powershell to set registry keys for system-wide proxy
	// ProxyEnable = 1, ProxyServer = socks=127.0.0.1:1080
	cmd := exec.Command("powershell", "-Command", fmt.Sprintf(`
		Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' -Name ProxyEnable -Value 1
		Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' -Name ProxyServer -Value 'socks=%s'
	`, addr))
	return cmd.Run()
}

func unsetWindowsProxy() error {
	cmd := exec.Command("powershell", "-Command", `
		Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' -Name ProxyEnable -Value 0
	`)
	return cmd.Run()
}

func setMacOSProxy(addr string) error {
	host, port, err := net.SplitHostPort(addr)
	if err != nil {
		host = "127.0.0.1"
		port = "1080"
	}
	
	// Detect active network interface (usually Wi-Fi)
	// In a real app, we'd iterate through networksetup -listallnetworkservices
	interfaceName := "Wi-Fi"
	
	exec.Command("networksetup", "-setsocksfirewallproxy", interfaceName, host, port).Run()
	return exec.Command("networksetup", "-setsocksfirewallproxystate", interfaceName, "on").Run()
}

func unsetMacOSProxy() error {
	interfaceName := "Wi-Fi"
	return exec.Command("networksetup", "-setsocksfirewallproxystate", interfaceName, "off").Run()
}

func setLinuxProxy(addr string) error {
	// Attempt to set GNOME proxy settings
	exec.Command("gsettings", "set", "org.gnome.system.proxy", "mode", "'manual'").Run()
	exec.Command("gsettings", "set", "org.gnome.system.proxy.socks", "host", fmt.Sprintf("'%s'", addr)).Run()
	
	log.Println("[E.S.C.A.P.E. SysProxy] Linux: GNOME settings updated. Note: CLI tools may require ALL_PROXY environment variable.")
	return nil
}

func unsetLinuxProxy() error {
	return exec.Command("gsettings", "set", "org.gnome.system.proxy", "mode", "'none'").Run()
}
