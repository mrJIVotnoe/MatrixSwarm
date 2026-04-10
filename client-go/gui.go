package main

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/driver/desktop"
	"fyne.io/fyne/v2/widget"
	"fmt"
	"log"
	"time"
)

// StartGUI initializes and runs the Fyne GUI
func StartGUI() {
	myApp := app.NewWithID("com.swarm.escape")
	myWindow := myApp.NewWindow("E.S.C.A.P.E. Node Control")
	myWindow.Resize(fyne.NewSize(300, 200))

	statusLabel := widget.NewLabel("Status: Active (Symbiosis Established)")
	statusLabel.Alignment = fyne.TextAlignCenter

	statsLabel := widget.NewLabel("Bypassed: 0 | Saved: 0 KB")
	statsLabel.Alignment = fyne.TextAlignCenter

	leaderLabel := widget.NewLabel("Leader: Searching...")
	leaderLabel.Alignment = fyne.TextAlignCenter

	// Update stats and leader status periodically
	go func() {
		for {
			time.Sleep(1 * time.Second)
			stats.RLock()
			statsText := fmt.Sprintf("Bypassed: %d | Saved: %d KB", stats.EvasionSuccesses, stats.DataSavedBytes/1024)
			stats.RUnlock()
			statsLabel.SetText(statsText)

			leaderText := fmt.Sprintf("Leader: %s | Trust: %.1f", localLeader, trustScore)
			leaderLabel.SetText(leaderText)
		}
	}()

	var toggleBtn *widget.Button
	toggleBtn = widget.NewButton("Switch OFF", func() {
		if proxyEnabled {
			log.Println("[GUI] Disabling Proxy...")
			UnsetSystemProxy()
			proxyEnabled = false
			toggleBtn.SetText("Switch ON")
			statusLabel.SetText("Status: Inactive (Disconnected)")
		} else {
			log.Println("[GUI] Enabling Proxy...")
			SetSystemProxy("127.0.0.1:1080")
			proxyEnabled = true
			toggleBtn.SetText("Switch OFF")
			statusLabel.SetText("Status: Active (Symbiosis Established)")
		}
	})

	updateBtn := widget.NewButton("Check for Updates", func() {
		go CheckForUpdates()
	})

	// System Tray Integration
	if desk, ok := myApp.(desktop.App); ok {
		m := fyne.NewMenu("E.S.C.A.P.E.",
			fyne.NewMenuItem("Show Window", func() {
				myWindow.Show()
			}),
			fyne.NewMenuItemSeparator(),
			fyne.NewMenuItem("Exit", func() {
				UnsetSystemProxy()
				myApp.Quit()
			}),
		)
		desk.SetSystemTrayMenu(m)
	}

	// Prevent window from closing the app, just hide it
	myWindow.SetCloseIntercept(func() {
		myWindow.Hide()
	})

	content := container.NewVBox(
		widget.NewLabelWithStyle("SWARM CORE", fyne.TextAlignCenter, fyne.TextStyle{Bold: true}),
		statusLabel,
		statsLabel,
		leaderLabel,
		container.NewCenter(toggleBtn),
		container.NewCenter(updateBtn),
		widget.NewHyperlink("View Roadmap", nil),
	)

	myWindow.SetContent(content)
	myWindow.ShowAndRun()
}
