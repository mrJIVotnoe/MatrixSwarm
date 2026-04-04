package main

/*
// Флаги для линковщика CGO. Указываем, где искать скомпилированную библиотеку Rust.
#cgo LDFLAGS: -L../client-rust/target/release -lescape_engine
#include <stdlib.h>

// Объявляем сигнатуру Rust-функции, чтобы CGO знал о ней
int process_stream(int fd, const char* strategy);
*/
import "C"
import (
	"fmt"
	"log"
	"unsafe"
)

// ApplyEvasionStrategy — это обертка над вызовом Rust-библиотеки.
// Она берет файловый дескриптор соединения и строку стратегии,
// передавая их в "The Muscle" (Rust Engine) для низкоуровневой обработки.
func ApplyEvasionStrategy(fd int, strategy string) error {
	// Преобразуем Go-строку в C-строку
	cStrategy := C.CString(strategy)
	
	// Обязательно освобождаем память, выделенную под C-строку, после завершения
	defer C.free(unsafe.Pointer(cStrategy))

	log.Printf("[E.S.C.A.P.E. Core] Handing over FD %d to Rust Engine with strategy: %s", fd, strategy)

	// Вызываем Rust-функцию через CGO
	result := C.process_stream(C.int(fd), cStrategy)
	
	if result != 0 {
		return fmt.Errorf("rust engine failed to process stream with code: %d", result)
	}
	
	return nil
}
