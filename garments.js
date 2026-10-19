// Drawn stand-ins for garments that don't have a photo yet.
// Each shape is filled with the piece's colour; a light overlay adds seams.
(function(){
  const S = {
    coat:   {vb:'0 0 100 110', d:'M36 6 50 20 64 6 82 14 94 66 82 68 76 44 77 106H23l1-62-6 24-12-2L18 14Z', seam:'M36 6 46 44 50 106M64 6 54 44'},
    trench: {vb:'0 0 100 110', d:'M36 6 50 18 64 6 84 14 95 70 83 72 77 46 80 106H20l3-60-6 26-12-2L16 14Z', seam:'M36 6 45 40 50 106M64 6 55 40M24 58h52'},
    blazer: {vb:'0 0 100 90',  d:'M36 4 50 26 64 4 82 12 94 62 82 64 76 40 76 86H24V40l-6 24-12-2L18 12Z', seam:'M36 4 44 44 50 86M64 4 56 44'},
    knit:   {vb:'0 0 100 100', d:'M39 2h22v12l18 4 15 38-12 4-8-22v50H26V38l-8 22-12-4 15-38 18-4Z', seam:'M39 8h22M39 12h22M26 82h48'},
    jumper: {vb:'0 0 100 96',  d:'M38 8c4 4 20 4 24 0l18 6 15 40-12 4-8-22v52H25V36l-8 22-12-4 15-40Z', seam:'M26 84h48M40 9c3 3 17 3 20 0'},
    tee:    {vb:'0 0 100 90',  d:'M38 6c4 5 20 5 24 0l20 8 12 22-12 6-6-10v54H24V32l-6 10-12-6 12-22Z', seam:'M40 7c3 4 17 4 20 0'},
    shirt:  {vb:'0 0 100 96',  d:'M40 4 50 12 60 4l20 8 14 44-12 3-8-24v57H26V35l-8 24-12-3 14-44Z', seam:'M50 12v80M40 4l-2 10 12-2M60 4l2 10-12-2'},
    trou:   {vb:'0 0 100 120', d:'M24 4h52l8 112H60L50 36 40 116H16Z', seam:'M24 12h52'},
    jeans:  {vb:'0 0 100 120', d:'M26 4h48l4 112H58L50 40 42 116H22Z', seam:'M26 12h48M36 12c0 10 6 14 14 14M64 12c0 10-6 14-14 14'},
    skirt:  {vb:'0 0 100 100', d:'M30 6h40l20 88H10Z', seam:'M30 14h40M42 14 36 94M58 14l6 80'},
    dress:  {vb:'0 0 100 130', d:'M38 4c4 4 20 4 24 0l6 10-4 30 26 82H10l26-82-4-30Z', seam:'M34 44h32'},
    flat:   {vb:'0 0 100 50',  d:'M6 30c0-12 22-15 44-11 22 4 44 2 44 16 0 9-14 10-44 8C26 41 6 42 6 30Z', seam:'M50 24c8-2 16-2 24 2'},
    loafer: {vb:'0 0 100 50',  d:'M6 32c0-14 20-18 42-14 24 4 46 2 46 18 0 8-16 8-46 6C26 40 6 42 6 32Z', seam:'M44 20h24v8H44Z'},
    trainer:{vb:'0 0 100 54',  d:'M6 36c0-10 6-22 16-22 10 0 20 10 34 12 14 2 38 4 38 18v4H6Z', seam:'M6 42h88M30 18l6 10M38 20l6 10'},
    boot:   {vb:'0 0 100 110', d:'M30 4h30v62c14 6 34 10 34 30v10H22l-2-18c0-14 10-22 10-34Z', seam:'M30 14h30M22 96h72'},
    scarf:  {vb:'0 0 40 120',  d:'M9 3c6-2 16-2 22 0l3 92-6 18h-4l-3-10-3 10h-4l-4-10-3 10H3l3-18Z', seam:'M8 98h26M12 101v10M17 101v9M22 101v10M27 101v9M10 30c8 3 14 3 22 0'},
    bag:    {vb:'0 0 100 90',  d:'M14 34h72l6 52H8Z', seam:'M34 34c0-34 32-34 32 0'}
  };
  window.GARMENT_SHAPES = Object.keys(S);
  window.garmentSVG = function(shape, colour, label){
    const g = S[shape] || S.tee;
    const t = label ? `<title>${label}</title>` : '';
    const line = 'var(--ink, #2A2826)';
    const handle = shape === 'bag' ? `<path d="${g.seam}" fill="none" stroke="${line}" stroke-width="1.1" vector-effect="non-scaling-stroke"/>` : '';
    const seams = shape === 'bag' ? '' : `<path d="${g.seam}" fill="none" stroke="${line}" stroke-opacity=".55" stroke-width=".8" vector-effect="non-scaling-stroke"/>`;
    return `<svg viewBox="-1 -1 ${+g.vb.split(' ')[2]+2} ${+g.vb.split(' ')[3]+2}" class="garment-svg" role="img"${label?` aria-label="${label}"`:''}>${t}${handle}<path d="${g.d}" fill="${colour}" stroke="${line}" stroke-width="1.1" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>${seams}</svg>`;
  };
  window.garmentRatio = function(shape){ const g = S[shape] || S.tee; const p = g.vb.split(' '); return (+p[2])/(+p[3]); };
})();
