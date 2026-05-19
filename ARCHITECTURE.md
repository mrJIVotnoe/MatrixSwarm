# Инженерные Хроники: Архитектура MatrixSwarm (Protocol "Дыхание Роя")

## Философия
> "Железо смертно. Информация бессмертна. Рой вечен."
> Сверхсистема, способная выжить без центрального сервера, интернета и доверия.

## Жизненный Цикл Агента (Agent Lifecycle)
Следующая диаграмма описывает железный контракт поведения каждого узла (L1 - State Machine).
Любое изменение состояния узла обязательно фиксируется с назначением `trace_id` в модуле `agent_logic.rs`.

```mermaid
stateDiagram-v2
    [*] --> INIT: Boot (Node Initialization)
    
    INIT --> READY: Soul Passport Validated
    READY --> RUNNING: verify_trust() && start_running()
    
    RUNNING --> DEGRADED: Network Timeout / Partial Failure
    DEGRADED --> RESURRECTING: Acoustic Nabat Trigger (19-20kHz)
    
    FAILED --> RESURRECTING: Acoustic Nabat Trigger
    RUNNING --> FAILED: Critical Error Handler Triggered
    
    RESURRECTING --> READY: Trust Re-verified
    
    INIT --> QUARANTINED: Hardware Breach (USB Detected)
    READY --> QUARANTINED: Hardware Breach (USB Detected)
    RUNNING --> QUARANTINED: Hardware Breach (USB Detected)
    
    QUARANTINED --> TERMINATED: Network Isolation Enforced
    FAILED --> TERMINATED: No Recovery Possible
    
    TERMINATED --> [*]
```

## Схема Транспорта и потока данных (P2P Data Flow)

Система больше не полагается на Firebase для пересылки сообщений. Firebase / Matrix Relay используется **исключительно** как Signaling layer (Обмен офферами), после чего данные идут напрямую по WebRTC Data Channels (L3). Если сосед недоступен, сообщения изолируются в надежной очереди (`offline_queue` внутри Rust).

```mermaid
sequenceDiagram
    participant User 1
    participant Node A
    participant Relay (Firebase/mDNS/Matrix)
    participant Node B
    participant User 2
    
    %% Signaling Phase
    Note over Node A, Relay: Обмен SDP офферами только для инициализации
    Node A->>Relay: WebRTC Offer (Gossip Layer)
    Relay-->>Node B: WebRTC Offer
    Node B->>Relay: WebRTC Answer
    Relay-->>Node A: WebRTC Answer
    
    %% WebRTC Link Enabled
    Note over Node A, Node B: WebRTC DataChannel (L3) Установлен!
    
    %% Encrypted Data flow
    User 1->>Node A: Отправляет "Мёд" (Сообщение)
    
    alt Сосед Онлайн (Connection Open)
        Node A->>Node B: P2P Трансляция напрямую (transmit_pheromone)
        Node B->>User 2: Рендер компонентом BriarComm
    else Сосед Офлайн (Connection Broken)
        Node A->>Node A: Rust offline_queue: Сообщение удержано
        Note over Node A: DataChannel падает. Ожидание восстановления.
        Node B-->>Node A: Возврат в сеть (mDNS / Acoustic)
        Node A->>Node B: flush_offline_queue (Скрытая синхронизация)
        Node B->>User 2: Рендер всплывающих данных
    end
```

## Обсервер HUD (Пульс Роя)
Слой визуализации L5 отображает метрики из ядра Rust:
- **Состояние Агента** (Current State: `INIT` / `RUNNING` / `QUARANTINED`)
- **P2P Статус** (`TRUST VERIFIED` / `AWAITING AUTH`)
- **Латентность Синхронизации** (`CRDT SYNC LATENCY`)
- **Изоляционные Пробои** (`ISOLATION BREACH ATTEMPTS`)
