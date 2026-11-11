export const COLAB_SCRIPT = `# ============================================================
#  TikTok Effect & Video AutoHub — Worker para Google Colab
#  Custo zero: Auto-Editor + Whisper local + FFmpeg (GPU T4)
# ============================================================

# 1) Dependências
!pip -q install auto-editor faster-whisper
!apt -qq install -y ffmpeg > /dev/null

# 2) Google Drive como pasta de destino
from google.colab import drive
drive.mount('/content/drive')

import os, glob, subprocess
from faster_whisper import WhisperModel

BASE   = '/content/drive/MyDrive/TikTokAutoHub'
INPUT  = f'{BASE}/brutos'
OUTPUT = f'{BASE}/prontos'
os.makedirs(INPUT, exist_ok=True); os.makedirs(OUTPUT, exist_ok=True)

model = WhisperModel('small', device='cuda', compute_type='float16')

def ts(t):
    h, m, s = int(t // 3600), int(t % 3600 // 60), t % 60
    return f'{h}:{m:02d}:{s:05.2f}'

def legendas_capcut(video, ass_path):
    """Gera legendas palavra por palavra no estilo CapCut (.ass)."""
    segments, _ = model.transcribe(video, language='pt', word_timestamps=True)
    header = (
        '[Script Info]\\nPlayResX: 1080\\nPlayResY: 1920\\n\\n[V4+ Styles]\\n'
        'Format: Name,Fontname,Fontsize,PrimaryColour,OutlineColour,BorderStyle,Outline,Shadow,Alignment,MarginV\\n'
        'Style: CapCut,Montserrat ExtraBold,92,&H00FFFFFF,&H00000000,1,6,0,2,520\\n\\n'
        '[Events]\\nFormat: Layer,Start,End,Style,Text\\n'
    )
    lines = []
    for seg in segments:
        for w in seg.words:
            word = w.word.strip().upper()
            lines.append(f'Dialogue: 0,{ts(w.start)},{ts(w.end)},CapCut,{{\\\\c&H00F4EE25&}}{word}')
    open(ass_path, 'w', encoding='utf-8').write(header + '\\n'.join(lines))

def processar(video, cortar=True, legendar=True, vertical=True):
    nome = os.path.splitext(os.path.basename(video))[0]
    atual = video
    if cortar:
        cortado = f'/content/{nome}_cut.mp4'
        subprocess.run(['auto-editor', atual, '--margin', '0.2sec', '-o', cortado, '--no-open'], check=True)
        atual = cortado
    filtros = []
    if vertical:
        filtros.append('scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920')
    if legendar:
        ass = f'/content/{nome}.ass'
        legendas_capcut(atual, ass)
        filtros.append(f"ass='{ass}'")
    saida = f'{OUTPUT}/{nome}_autohub_9x16.mp4'
    cmd = ['ffmpeg', '-y', '-i', atual]
    if filtros:
        cmd += ['-vf', ','.join(filtros)]
    cmd += ['-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-c:a', 'aac', saida]
    subprocess.run(cmd, check=True)
    print('✅ Pronto:', saida)

# 3) Processa tudo que estiver em /brutos
for v in glob.glob(f'{INPUT}/*.mp4') + glob.glob(f'{INPUT}/*.mov'):
    processar(v)
print('🚀 AutoHub finalizado — confira a pasta prontos/ no Drive')
`;
