import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  key?: string;
}

export default function SplashScreen({
  onComplete,
}: SplashScreenProps) {

  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {

    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2600);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };

  }, [onComplete]);

  return (
    <>
      <style>{`

        *{
          margin:0;
          padding:0;
          box-sizing:border-box;
        }

        .flowce-splash{
          position:fixed;
          inset:0;
          z-index:9999;

          overflow:hidden;

          display:flex;
          justify-content:center;
          align-items:center;

          font-family:'Inter',sans-serif;

          background:
            radial-gradient(circle at top,#241c52 0%,transparent 45%),
            radial-gradient(circle at bottom,#101018 0%,transparent 40%),
            #07070c;
        }

        .flowce-splash::before{
          content:'';
          position:absolute;

          width:700px;
          height:700px;

          background:
            radial-gradient(
              circle,
              rgba(117,92,255,.18),
              transparent 70%
            );

          filter:blur(60px);

          animation:bgMove 8s ease-in-out infinite alternate;
        }

        .noise{
          position:fixed;
          inset:0;

          opacity:.03;

          background-image:
            radial-gradient(
              rgba(255,255,255,.28) .5px,
              transparent .5px
            );

          background-size:4px 4px;

          mix-blend-mode:soft-light;
        }

        .splash{
          position:relative;
          width:100%;
          height:100%;

          display:flex;
          justify-content:center;
          align-items:center;
        }

        .rings{
          position:absolute;

          width:540px;
          height:540px;

          border-radius:50%;
          border:1px solid rgba(255,255,255,.04);

          animation:rotate 18s linear infinite;
        }

        .rings::before,
        .rings::after{
          content:'';
          position:absolute;

          border-radius:50%;
          border:1px solid rgba(255,255,255,.03);
        }

        .rings::before{
          inset:50px;
        }

        .rings::after{
          inset:110px;
        }

        .logo-container{
          position:relative;

          display:flex;
          align-items:center;
          gap:34px;

          opacity:0;

          transform:
            translateY(40px)
            scale(.9);

          animation:
            intro 1s cubic-bezier(.16,1,.3,1)
            forwards;
        }

        .icon-wrap{
          position:relative;
          width:120px;
          height:120px;
        }

        .glow{
          position:absolute;
          inset:-45px;

          background:
            radial-gradient(
              circle,
              rgba(117,92,255,.45),
              rgba(117,92,255,.12) 45%,
              transparent 72%
            );

          filter:blur(45px);

          animation:pulse 3s ease-in-out infinite;
        }

        .icon-card{
          position:relative;

          width:120px;
          height:120px;

          border-radius:26px;
          overflow:hidden;

          background:
            linear-gradient(
              180deg,
              #7c67ff 0%,
              #624be4 42%,
              #4a36b8 100%
            );

          box-shadow:
            0 20px 60px rgba(98,77,255,.30),
            0 8px 24px rgba(0,0,0,.35),
            inset 0 1px 1px rgba(255,255,255,.06),
            inset 0 -2px 10px rgba(0,0,0,.18);

          backdrop-filter:blur(20px);
        }

        .icon-card::before{
          content:'';

          position:absolute;
          inset:0;

          border-radius:26px;

          background:
            linear-gradient(
              180deg,
              rgba(255,255,255,.06),
              transparent 38%
            );

          pointer-events:none;
        }

        .icon-card::after{
          content:'';

          position:absolute;
          inset:0;

          border-radius:26px;

          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,.03);

          pointer-events:none;
        }

        .shine{
          position:absolute;

          top:-40%;
          left:-120%;

          width:60%;
          height:180%;

          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(255,255,255,.10),
              transparent
            );

          transform:rotate(18deg);

          animation:shine 2.8s linear infinite;
        }

        .logo-svg{
          position:absolute;
          inset:0;

          display:flex;
          justify-content:center;
          align-items:center;

          padding:2px;
        }

        .logo-line-bg{
          opacity:.14;
        }

        .logo-line,
        .logo-line-bg{
          filter:
            drop-shadow(0 0 2px rgba(255,255,255,.15));
        }

        .logo-line{
          stroke-dasharray:100;
          stroke-dashoffset:100;

          animation:
            draw 1.1s cubic-bezier(.65,0,.35,1)
            forwards;
        }

        .tracer{
          offset-distance:0%;

          animation:
            moveDot 1.1s cubic-bezier(.65,0,.35,1)
            forwards;
        }

        .dot-glow{
          opacity:.95;
        }

        .final-dot{
          opacity:0;

          animation:
            finalDot .3s ease forwards;

          animation-delay:1s;
        }

        .text-group{
          display:flex;
          flex-direction:column;
          gap:8px;
        }

        .brand{
          color:white;

          font-size:68px;
          font-weight:600;

          letter-spacing:-0.06em;
          line-height:1;

          overflow:hidden;
        }

        .brand span{
          display:inline-block;

          transform:translateY(120%);
          opacity:0;

          animation:
            textRise .9s cubic-bezier(.16,1,.3,1)
            forwards;

          animation-delay:.45s;
        }

        .tagline{
          color:#bcb4ff;

          font-size:17px;
          font-weight:500;

          letter-spacing:.04em;

          opacity:0;
          transform:translateY(14px);

          animation:
            tagline .8s ease forwards;

          animation-delay:.85s;
        }

        .particles span{
          position:absolute;

          width:5px;
          height:5px;

          border-radius:50%;

          background:
            rgba(255,255,255,.65);

          filter:blur(.5px);

          animation:float 4s linear infinite;
        }

        .particles span:nth-child(1){
          top:22%;
          left:30%;
          animation-delay:0s;
        }

        .particles span:nth-child(2){
          top:68%;
          left:64%;
          animation-delay:1s;
        }

        .particles span:nth-child(3){
          top:40%;
          left:75%;
          animation-delay:2s;
        }

        .fade-out{
          animation:
            fadeOut .9s cubic-bezier(.16,1,.3,1)
            forwards;
        }

        @keyframes intro{

          to{
            opacity:1;

            transform:
              translateY(0)
              scale(1);
          }

        }

        @keyframes draw{

          to{
            stroke-dashoffset:0;
          }

        }

        @keyframes moveDot{

          to{
            offset-distance:100%;
          }

        }

        @keyframes finalDot{

          to{
            opacity:1;
          }

        }

        @keyframes textRise{

          to{
            transform:translateY(0);
            opacity:1;
          }

        }

        @keyframes tagline{

          to{
            opacity:1;
            transform:translateY(0);
          }

        }

        @keyframes pulse{

          0%,100%{
            transform:scale(1);
            opacity:.6;
          }

          50%{
            transform:scale(1.08);
            opacity:1;
          }

        }

        @keyframes rotate{

          from{
            transform:rotate(0deg);
          }

          to{
            transform:rotate(360deg);
          }

        }

        @keyframes shine{

          from{
            transform:
              translateX(-250%)
              rotate(18deg);
          }

          to{
            transform:
              translateX(420%)
              rotate(18deg);
          }

        }

        @keyframes float{

          0%{
            transform:translateY(0);
            opacity:0;
          }

          20%{
            opacity:1;
          }

          100%{
            transform:translateY(-40px);
            opacity:0;
          }

        }

        @keyframes bgMove{

          from{
            transform:translate(-50px,-30px);
          }

          to{
            transform:translate(40px,20px);
          }

        }

        @keyframes fadeOut{

          to{
            opacity:0;

            transform:
              scale(1.05);

            filter:blur(14px);
          }

        }

        @media(max-width:768px){

          .logo-container{
            flex-direction:column;
            gap:24px;
          }

          .brand{
            font-size:48px;
            text-align:center;
          }

          .tagline{
            text-align:center;
            font-size:15px;
          }

        }

      `}</style>

      <div className="flowce-splash">

        <div className="noise" />

        <div className={`splash ${fadeOut ? 'fade-out' : ''}`}>

          <div className="rings"></div>

          <div className="particles">
            <span></span>
            <span></span>
            <span></span>
          </div>

          <div className="logo-container">

            <div className="icon-wrap">

              <div className="glow"></div>

              <div className="icon-card">

                <div className="shine"></div>

                <div className="logo-svg">

                  <svg
                    width="78"
                    height="78"
                    viewBox="0 0 54 54"
                    fill="none"
                    style={{ transform: 'translateY(1px)' }}
                  >

                    <path
                      d="M9 33C14 24 17 19 22 19C27 19 29 31 34 31C39 31 40 20 45 13"
                      stroke="white"
                      strokeWidth="4.2"
                      strokeLinecap="round"
                      className="logo-line-bg"
                    />

                    <path
                      d="M9 33C14 24 17 19 22 19C27 19 29 31 34 31C39 31 40 20 45 13"
                      stroke="white"
                      strokeWidth="4.2"
                      strokeLinecap="round"
                      pathLength="100"
                      className="logo-line"
                    />

                    <g
                      className="tracer"
                      style={{
                        offsetPath:
                          "path('M9 33C14 24 17 19 22 19C27 19 29 31 34 31C39 31 40 20 45 13')",
                      }}
                    >
                      <circle
                        cx="0"
                        cy="0"
                        r="4.6"
                        fill="white"
                        className="dot-glow"
                      />
                    </g>

                    <circle
                      cx="45"
                      cy="13"
                      r="4.6"
                      fill="white"
                      className="final-dot"
                    />

                  </svg>

                </div>

              </div>

            </div>

            <div className="text-group">

              <div className="brand">
                <span>Flowce</span>
              </div>

              <div className="tagline">
                personal finance · AI powered
              </div>

            </div>

          </div>

        </div>

      </div>
    </>
  );
}