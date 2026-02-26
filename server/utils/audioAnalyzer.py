import wave
import numpy as np
import sys
import json
import os

def stretch_audio(data, rate, framerate):
    """Simple OLA (Overlap-Add) for time-stretching without changing pitch"""
    if rate == 1.0:
        return data
        
    # Parameters for OLA
    hop_size = int(framerate * 0.02) # 20ms
    window_size = hop_size * 2
    
    # Target hop size for the output
    target_hop = int(hop_size * rate)
    
    if target_hop == 0: target_hop = 1
    
    # Window function
    window = np.hanning(window_size)
    
    # Calculate output length
    output_len = int(len(data) / rate) + window_size
    output = np.zeros(output_len, dtype=np.float32)
    
    input_ptr = 0
    output_ptr = 0
    
    while input_ptr + window_size < len(data):
        # Extract frame
        frame = data[input_ptr:input_ptr + window_size] * window
        
        # Add to output
        if output_ptr + window_size < output_len:
            output[output_ptr:output_ptr + window_size] += frame
        
        # Advance pointers
        input_ptr += target_hop
        output_ptr += hop_size
        
    return output

def analyze_audio(wav_path, speed=1.0):
    try:
        if not os.path.exists(wav_path):
            return {"error": "File not found"}

        with wave.open(wav_path, 'rb') as wr:
            params = wr.getparams()
            n_channels, sampwidth, framerate, n_frames = params[:4]
            content = wr.readframes(n_frames)
            
            # Convert binary data to numpy array
            if sampwidth == 2:
                data = np.frombuffer(content, dtype=np.int16).astype(np.float32)
            else:
                data = np.frombuffer(content, dtype=np.int8).astype(np.float32)
            
            # If stereo, convert to mono for analysis
            if n_channels == 2:
                mono_data = data.reshape(-1, 2).mean(axis=1)
            else:
                mono_data = data

            # Apply time-stretching if needed
            if speed != 1.0:
                print(f"Stretching audio by factor {speed}...", file=sys.stderr)
                stretched_mono = stretch_audio(mono_data, speed, framerate)
                
                # If we stretched mono, we should also stretch the ORIGINAL data to save it back
                if n_channels == 1:
                    final_data = stretched_mono
                else:
                    # Handle stereo stretching by stretching each channel
                    left = stretch_audio(data.reshape(-1, 2)[:, 0], speed, framerate)
                    right = stretch_audio(data.reshape(-1, 2)[:, 1], speed, framerate)
                    # Use the shorter one to avoid size mismatch
                    min_len = min(len(left), len(right))
                    final_data = np.vstack((left[:min_len], right[:min_len])).T.flatten()
                
                # Save back the stretched audio
                with wave.open(wav_path, 'wb') as ww:
                    ww.setparams(params)
                    ww.setnframes(len(final_data) // (n_channels if n_channels > 1 else 1))
                    
                    if sampwidth == 2:
                        ww.writeframes(final_data.astype(np.int16).tobytes())
                    else:
                        ww.writeframes(final_data.astype(np.int8).tobytes())
                
                # Update analysis data
                mono_data = stretched_mono
                n_frames = len(stretched_mono)

            # Analyze audio (on mono_data)
            # Normalize to 0-1 range
            max_val = np.iinfo(np.int16).max if sampwidth == 2 else 127
            float_data = np.abs(mono_data / max_val)
            
            # Analyze in 20ms windows
            window_size = int(framerate * 0.02)
            n_windows = len(float_data) // window_size
            
            if n_windows == 0:
                return {"start": 0, "end": 0, "silences": []}

            energies = np.array([np.mean(float_data[i*window_size:(i+1)*window_size]) for i in range(n_windows)])
            threshold = max(np.mean(energies) * 0.15, 0.005)
            is_speech = energies > threshold
            
            speech_indices = np.where(is_speech)[0]
            if len(speech_indices) == 0:
                total_dur = len(mono_data) / framerate
                return {"start": 0, "end": total_dur, "silences": []}
            
            start_time = float(speech_indices[0] * 0.02)
            end_time = float(speech_indices[-1] * 0.02)
            
            silences = []
            silence_start = -1
            for i, val in enumerate(is_speech):
                if not val:
                    if silence_start == -1: silence_start = i
                else:
                    if silence_start != -1:
                        dur = (i - silence_start) * 0.02
                        if dur > 0.15:
                            silences.append({
                                "start": float(silence_start * 0.02),
                                "end": float(i * 0.02),
                                "duration": float(dur)
                            })
                        silence_start = -1
            
            return {
                "success": True,
                "start": start_time,
                "end": end_time,
                "totalDuration": float(len(mono_data) / framerate),
                "silences": silences,
                "speed": speed
            }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No path provided"}))
    else:
        path = sys.argv[1]
        speed = 1.0
        if len(sys.argv) > 2:
            try:
                speed = float(sys.argv[2])
            except:
                pass
        
        result = analyze_audio(path, speed)
        print(json.dumps(result))
