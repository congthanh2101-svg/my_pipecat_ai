#!/bin/bash
# Deploy mod_audio_stream with 8kHz sample rate fix

SERVER="root@10.120.60.161"
BUILD_DIR="/usr/local/src/mod_audio_stream_pipecat"

echo "=== Deploy mod_audio_stream with 8kHz sample rate ==="

# 1. Copy modified files to server
echo "Step 1: Copying modified files to server..."
scp audio_streamer_glue.cpp ${SERVER}:${BUILD_DIR}/
scp protobuf_audio.h ${SERVER}:${BUILD_DIR}/

# 2. Build on server
echo "Step 2: Building module on server..."
ssh ${SERVER} << 'ENDSSH'
cd /usr/local/src/mod_audio_stream_pipecat/build
make clean
make

if [ $? -ne 0 ]; then
    echo "ERROR: Build failed!"
    exit 1
fi

# 3. Stop FreeSWITCH
echo "Step 3: Stopping FreeSWITCH..."
systemctl stop freeswitch

# 4. Backup old module (with timestamp)
echo "Step 4: Backing up old module..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp /usr/local/freeswitch/mod/mod_audio_stream.so \
   /usr/local/freeswitch/mod/mod_audio_stream.so.backup_${TIMESTAMP}
echo "Backup created: mod_audio_stream.so.backup_${TIMESTAMP}"

# 5. Install new module
echo "Step 5: Installing new module..."
cp mod_audio_stream.so /usr/local/freeswitch/mod/

# 6. Start FreeSWITCH
echo "Step 6: Starting FreeSWITCH..."
systemctl start freeswitch

# 7. Wait and check status
sleep 3
systemctl status freeswitch | head -10

echo ""
echo "=== Deployment completed ==="
echo "Module size:"
ls -lh /usr/local/freeswitch/mod/mod_audio_stream.so
echo ""
echo "Test by calling extension 9902"
ENDSSH

echo ""
echo "=== Deploy script finished ==="
echo "Now call extension 9902 to test"
