package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"strings"
)

/**
 * MatrixEchoMessage represents the telemetry data shared via Matrix
 */
type MatrixEchoMessage struct {
	Type      string `json:"type"`
	ISP       string `json:"isp"`
	Strategy  string `json:"strategy"`
	Target    string `json:"target"`
	Success   bool   `json:"success"`
	Timestamp int64  `json:"timestamp"`
}

/**
 * MatrixBridge handles the connection to the Matrix Echo protocol
 */
type MatrixBridge struct {
	SwarmKey string
}

/**
 * Decrypts a message from the Matrix Echo protocol
 * Format: iv_hex:ciphertext_base64
 */
func (m *MatrixBridge) Decrypt(encryptedBody string) (*MatrixEchoMessage, error) {
	if !strings.HasPrefix(encryptedBody, "ECHO_V2:") {
		return nil, fmt.Errorf("invalid message prefix")
	}

	payload := strings.TrimPrefix(encryptedBody, "ECHO_V2:")
	parts := strings.Split(payload, ":")
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid message format")
	}

	ivHex := parts[0]
	ciphertextBase64 := parts[1]

	iv, err := hex.DecodeString(ivHex)
	if err != nil {
		return nil, fmt.Errorf("failed to decode IV: %v", err)
	}

	ciphertext, err := base64.StdEncoding.DecodeString(ciphertextBase64)
	if err != nil {
		return nil, fmt.Errorf("failed to decode ciphertext: %v", err)
	}

	// Derive key using SHA256 (matching CryptoJS.SHA256)
	hasher := sha256.New()
	hasher.Write([]byte(m.SwarmKey))
	key := hasher.Sum(nil)

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %v", err)
	}

	if len(ciphertext)%aes.BlockSize != 0 {
		return nil, fmt.Errorf("ciphertext is not a multiple of the block size")
	}

	mode := cipher.NewCBCDecrypter(block, iv)
	decrypted := make([]byte, len(ciphertext))
	mode.CryptBlocks(decrypted, ciphertext)

	// Remove PKCS7 padding
	decrypted, err = pkcs7Unpad(decrypted, aes.BlockSize)
	if err != nil {
		return nil, fmt.Errorf("failed to unpad: %v", err)
	}

	var msg MatrixEchoMessage
	if err := json.Unmarshal(decrypted, &msg); err != nil {
		return nil, fmt.Errorf("failed to unmarshal JSON: %v", err)
	}

	return &msg, nil
}

/**
 * pkcs7Unpad removes PKCS7 padding from a buffer
 */
func pkcs7Unpad(data []byte, blockSize int) ([]byte, error) {
	if len(data) == 0 {
		return nil, fmt.Errorf("data is empty")
	}
	if len(data)%blockSize != 0 {
		return nil, fmt.Errorf("data is not a multiple of block size")
	}
	paddingLen := int(data[len(data)-1])
	if paddingLen <= 0 || paddingLen > blockSize {
		return nil, fmt.Errorf("invalid padding length")
	}
	for i := 0; i < paddingLen; i++ {
		if data[len(data)-1-i] != byte(paddingLen) {
			return nil, fmt.Errorf("invalid padding character")
		}
	}
	return data[:len(data)-paddingLen], nil
}

/**
 * ListenToEcho simulates listening to the Matrix room
 * In a real implementation, this would use a Matrix client library
 */
func (m *MatrixBridge) ListenToEcho() {
	log.Println("[MATRIX_BRIDGE] Listening to the Echo...")
	// This is where the integration with gomatrix would happen
}
