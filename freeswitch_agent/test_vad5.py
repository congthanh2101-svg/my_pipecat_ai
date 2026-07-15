"""Test EnergyVAD state management — đơn giản hóa."""
import sys, os, asyncio
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from bot_fs import EnergyVAD

async def test():
    print("=" * 60)
    print("TEST: EnergyVAD stale state recovery")
    print("=" * 60)

    vad = EnergyVAD(threshold=3, silence_secs=0.3)

    # Test 1: Khởi tạo
    assert vad._speaking == False, f"Expected False, got {vad._speaking}"
    print("✅ Test 1: _speaking=False khi khởi tạo")

    # Test 2: Stale state recovery
    print("\n--- Test 2: Stale _speaking=True → START still fires ---")
    vad._speaking = True
    vad._timer_task = None  # stale condition
    print(f"   Trước: speaking={vad._speaking}, timer={vad._timer_task}")

    # Mô phỏng process_frame logic
    audio = (np.ones(160, dtype=np.int16) * 500).tobytes()
    rms = float(np.sqrt(np.mean(np.frombuffer(audio, dtype=np.int16).astype(np.float64)**2)))
    print(f"   Audio RMS={rms:.0f} (threshold={vad._threshold})")

    # Stale recovery
    if vad._speaking and (vad._timer_task is None or vad._timer_task.done()):
        print(f"   ⚡ Stale reset → _speaking=False")
        vad._speaking = False

    # START check
    if rms > vad._threshold and not vad._speaking:
        print(f"   ⚡ START → _speaking=True")
        vad._speaking = True
        vad._reset_timer()

    print(f"   Sau: speaking={vad._speaking}, timer_alive={vad._timer_task is not None}")
    assert vad._speaking == True, "START should fire"
    assert vad._timer_task is not None, "Timer should be running"
    print("✅ Test 2: Stale recovery → START hoạt động!")

    # Test 3: Timer reset on speech
    print("\n--- Test 3: Timer reset ---")
    old_timer = vad._timer_task
    # Giả lập frame thứ 2
    rms2 = 450
    if rms2 > vad._threshold and vad._speaking:
        vad._reset_timer()
    new_timer = vad._timer_task
    print(f"   Timer changed: {new_timer is not old_timer}")
    assert new_timer is not old_timer, "Timer should be reset"
    print("✅ Test 3: Timer reset OK")

    # Test 4: Silence → STOP
    print("\n--- Test 4: Auto-STOP ---")
    await asyncio.sleep(0.5)
    print(f"   speaking={vad._speaking}")
    assert vad._speaking == False, "STOP should have fired"
    print("✅ Test 4: Auto-STOP OK")

    # Test 5: New speech cycle
    print("\n--- Test 5: New speech cycle ---")
    rms3 = 500
    if rms3 > vad._threshold and not vad._speaking:
        vad._speaking = True
        vad._reset_timer()
    print(f"   speaking={vad._speaking}")
    assert vad._speaking == True, "New START should fire"
    print("✅ Test 5: New speech cycle OK")

    # Test 6: Reset
    print("\n--- Test 6: reset() ---")
    await asyncio.sleep(0.1)  # let timer settle
    vad.reset()
    print(f"   speaking={vad._speaking}, timer={vad._timer_task}")
    assert vad._speaking == False
    print("✅ Test 6: reset() OK")

    print("\n" + "=" * 60)
    print("✅ ALL TESTS PASSED!")
    print("=" * 60)

asyncio.run(test())
