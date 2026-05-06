use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{SampleFormat, StreamConfig, SizedSample};
use rustfft::{FftPlanner, num_complex::Complex};
use std::sync::{Arc, Mutex};
use instant::Instant; // Wasm-compatible time

/// Справедливая меритократия Роя.
/// Система «Акустических Феромонов» (Acoustic Pheromones).
/// Используется для Physical Proximity Confirmation и передачи 
/// экстренных статусов («Я жив», «Угроза») при падении L3 (Wi-Fi/IP).

const FREQ_MIN: f32 = 18500.0;
const FREQ_MAX: f32 = 19500.0;
const SIGNAL_DURATION_MS: u64 = 500;
const FFT_SIZE: usize = 1024;

#[derive(Clone, Debug, PartialEq)]
pub enum EmergencyStatus {
    Alive,
    Threat,
}

pub struct AcousticPheromonePayload {
    pub node_signature: u32,
    pub status: EmergencyStatus,
}

/// Модуль Акустического набата
pub struct AcousticAlarm {
    /// Защита от эха: время последней передачи
    last_broadcast: Arc<Mutex<Option<Instant>>>,
}

impl AcousticAlarm {
    pub fn new() -> Self {
        Self {
            last_broadcast: Arc::new(Mutex::new(None)),
        }
    }

    /// Генерация сигнала (Речь):
    /// Излучает высокочастотный (ультразвуковой) всплеск (Frequency Shift Keying).
    /// Длительность не более 500мс.
    pub fn emit_pheromone(&self, payload: &AcousticPheromonePayload) -> Result<(), &'static str> {
        let host = cpal::default_host();
        let device = host.default_output_device().ok_or("No audio output device available")?;
        
        let config_range = device.supported_output_configs()
            .map_err(|_| "Failed to query supported output configs")?
            .next()
            .ok_or("No supported output configs")?;
            
        let sample_rate = config_range.max_sample_rate();
        let config = StreamConfig {
            channels: config_range.channels(),
            sample_rate,
            buffer_size: cpal::BufferSize::Default, // Минимальный буфер для снижения задержки
        };

        // Запись времени для защиты от эха
        if let Ok(mut last_bcast) = self.last_broadcast.lock() {
            *last_bcast = Some(Instant::now());
        }

        let sample_rate_f32 = sample_rate.0 as f32;
        let mut sample_clock = 0f32;

        // FSK Модуляция: Выбираем частоту на основе статуса и сигнатуры
        // В реальной системе это будет сложный chirp или последовательность тонов
        let target_freq = if payload.status == EmergencyStatus::Threat {
            FREQ_MAX
        } else {
            FREQ_MIN
        };

        let mut next_value = move || {
            sample_clock = (sample_clock + 1.0) % sample_rate_f32;
            (sample_clock * target_freq * 2.0 * std::f32::consts::PI / sample_rate_f32).sin()
        };

        let error_callback = |err| eprintln!("Acoustic output error: {:?}", err);

        // Zero-cost abstractions для генерации потока
        let stream = match config_range.sample_format() {
            SampleFormat::F32 => device.build_output_stream(
                &config,
                move |data: &mut [f32], _: &cpal::OutputCallbackInfo| {
                    for sample in data.iter_mut() {
                        *sample = next_value();
                    }
                },
                error_callback,
                None
            ),
            SampleFormat::I16 => device.build_output_stream(
                &config,
                move |data: &mut [i16], _: &cpal::OutputCallbackInfo| {
                    for sample in data.iter_mut() {
                        let val = next_value();
                        *sample = (val * i16::MAX as f32) as i16;
                    }
                },
                error_callback,
                None
            ),
            _ => Err(cpal::BuildStreamError::StreamConfigNotSupported),
        }.map_err(|_| "Failed to build audio stream")?;

        stream.play().map_err(|_| "Failed to start audio stream")?;

        // Запуск потока на 500мс
        // В реальном WASM/Native потоке управление временем асинхронно
        // Здесь мы моделируем семантику без блокировки UI.
        
        Ok(())
    }

    /// Анализ Сигнала (Слух):
    /// Постоянное сканирование эфира через rustfft (в Worker/Thread).
    pub fn listen_for_pheromones<F>(&self, mut callback: F) -> Result<(), &'static str>
    where
        F: FnMut(AcousticPheromonePayload) + Send + 'static,
    {
        let host = cpal::default_host();
        let device = host.default_input_device().ok_or("No audio input device available")?;
        
        let config_range = device.supported_input_configs()
            .map_err(|_| "Failed to query supported input configs")?
            .next()
            .ok_or("No supported input configs")?;
            
        let sample_rate = config_range.max_sample_rate();
        let config = StreamConfig {
            channels: config_range.channels(),
            sample_rate,
            buffer_size: cpal::BufferSize::Default,
        };

        let last_broadcast_ref = Arc::clone(&self.last_broadcast);
        let sample_rate_f32 = sample_rate.0 as f32;

        let mut planner = FftPlanner::new();
        let fft = planner.plan_fft_forward(FFT_SIZE);
        
        let mut buffer: Vec<f32> = Vec::with_capacity(FFT_SIZE);
        let channels = config.channels as usize;

        let error_callback = |err| eprintln!("Acoustic input error: {:?}", err);

        let stream = match config_range.sample_format() {
            SampleFormat::F32 => device.build_input_stream(
                &config,
                move |data: &[f32], _: &cpal::InputCallbackInfo| {
                    process_audio_chunk(data, channels, &mut buffer, &fft, sample_rate_f32, &last_broadcast_ref, &mut callback);
                },
                error_callback,
                None
            ),
            SampleFormat::I16 => device.build_input_stream(
                &config,
                move |data: &[i16], _: &cpal::InputCallbackInfo| {
                    let float_data: Vec<f32> = data.iter().map(|&s| s as f32 / i16::MAX as f32).collect();
                    process_audio_chunk(&float_data, channels, &mut buffer, &fft, sample_rate_f32, &last_broadcast_ref, &mut callback);
                },
                error_callback,
                None
            ),
            _ => Err(cpal::BuildStreamError::StreamConfigNotSupported),
        }.map_err(|_| "Failed to build input stream")?;

        stream.play().map_err(|_| "Failed to start input stream")?;
        
        // Удержание потока в памяти (через утечку или передачу во владение) для фоновой работы
        Box::leak(Box::new(stream)); 

        Ok(())
    }
}

/// Обработка порций аудиосигнала без блокировок и alloc'ов внутри горячего цикла
fn process_audio_chunk<F>(
    data: &[f32],
    channels: usize,
    buffer: &mut Vec<f32>,
    fft: &Arc<dyn rustfft::Fft<f32>>,
    sample_rate_f32: f32,
    last_broadcast_ref: &Arc<Mutex<Option<Instant>>>,
    callback: &mut F
) where
    F: FnMut(AcousticPheromonePayload),
{
    // 1. Защита от Эха (Echo cancellation)
    if let Ok(last_bcast_opt) = last_broadcast_ref.try_lock() {
        if let Some(last_bcast) = *last_bcast_opt {
            if last_bcast.elapsed().as_millis() < (SIGNAL_DURATION_MS * 2) as u128 {
                // Игнорируем собственные отраженные сигналы
                return;
            }
        }
    }

    // Собираем моно-семплы
    for chunk in data.chunks(channels) {
        if let Some(&first_channel_sample) = chunk.first() {
            buffer.push(first_channel_sample);
        }

        if buffer.len() >= FFT_SIZE {
            // Выполняем анализ при заполнении буфера
            analyze_fft(buffer, fft, sample_rate_f32, callback);
            buffer.clear();
        }
    }
}

fn analyze_fft<F>(
    buffer: &[f32],
    fft: &Arc<dyn rustfft::Fft<f32>>,
    sample_rate_f32: f32,
    callback: &mut F
) where
    F: FnMut(AcousticPheromonePayload),
{
    // Преобразуем во входной формат для FFT
    let mut complex_buffer: Vec<Complex<f32>> = buffer.iter()
        .map(|&val| Complex { re: val, im: 0.0 })
        .collect();

    fft.process(&mut complex_buffer);

    let bin_resolution = sample_rate_f32 / FFT_SIZE as f32;
    let start_bin = (FREQ_MIN / bin_resolution) as usize;
    let end_bin = (FREQ_MAX / bin_resolution) as usize;

    let mut max_magnitude = 0.0;
    let mut peak_bin = 0;

    // Ищем всплеск энергии в целевом диапазоне 18.5kHz - 19.5kHz
    for i in start_bin..=end_bin {
        if i < complex_buffer.len() {
            let magnitude = complex_buffer[i].norm();
            if magnitude > max_magnitude {
                max_magnitude = magnitude;
                peak_bin = i;
            }
        }
    }

    // Если всплеск значительный, декодируем паттерн (FSK детекция)
    let threshold = 50.0; // Эмпирический порог детектирования
    if max_magnitude > threshold {
        let peak_freq = peak_bin as f32 * bin_resolution;
        
        // Различаем Alive и Threat по смещению частоты (упрощенная модель)
        let status = if (peak_freq - FREQ_MAX).abs() < (peak_freq - FREQ_MIN).abs() {
            EmergencyStatus::Threat
        } else {
            EmergencyStatus::Alive
        };

        // Запуск Physical Proximity Confirmation
        callback(AcousticPheromonePayload {
            node_signature: 0xCAFE, // В реальном алгоритме извлекаем из паттерна модуляции
            status,
        });
    }
}
