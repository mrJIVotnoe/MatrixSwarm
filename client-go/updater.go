package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"runtime"
	"time"
)

const (
	// In a real scenario, this would be a GitHub release URL or similar
	UPDATE_URL = "http://localhost:3000/api/v1/updates/engine"
)

// CheckForUpdates checks for a new version of the Rust engine and downloads it
func CheckForUpdates() {
	log.Println("[E.S.C.A.P.E. Updater] Checking for engine updates...")
	
	// Simulation: Try central server first
	err := downloadEngine(UPDATE_URL)
	if err != nil {
		log.Printf("[E.S.C.A.P.E. Updater] Central update failed: %v. Switching to P2P mode...", err)
		
		// P2P Fallback: Use discovered peers
		peers := GetPeers()
		if len(peers) > 0 {
			log.Printf("[E.S.C.A.P.E. Updater] Found %d peers via mDNS. Starting P2P download...", len(peers))
			for _, peer := range peers {
				p2pUrl := fmt.Sprintf("http://%s/p2p/engine", peer)
				log.Printf("[E.S.C.A.P.E. Updater] Attempting P2P download from %s...", peer)
				if err := downloadEngine(p2pUrl); err == nil {
					log.Println("[E.S.C.A.P.E. Updater] Engine updated successfully via P2P.")
					return
				}
			}
		} else {
			log.Println("[E.S.C.A.P.E. Updater] P2P update failed. No peers discovered via mDNS.")
		}
	} else {
		log.Println("[E.S.C.A.P.E. Updater] Engine updated successfully from central server.")
	}
}

func downloadEngine(url string) error {
	// Determine filename based on OS
	ext := ""
	if runtime.GOOS == "windows" {
		ext = ".dll"
	} else if runtime.GOOS == "darwin" {
		ext = ".dylib"
	} else {
		ext = ".so"
	}
	
	targetPath := fmt.Sprintf("./libescape_engine%s", ext)
	
	// Simulation of download
	time.Sleep(2 * time.Second)
	
	// For the demo, we'll simulate a failure for the central server to trigger P2P
	if url == UPDATE_URL {
		return fmt.Errorf("connection timed out (simulated)")
	}

	log.Printf("[E.S.C.A.P.E. Updater] Downloading from %s to %s...", url, targetPath)
	time.Sleep(3 * time.Second)
	return nil
}

// DownloadFile is a helper for real downloads
func DownloadFile(filepath string, url string) error {
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	out, err := os.Create(filepath)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	return err
}
