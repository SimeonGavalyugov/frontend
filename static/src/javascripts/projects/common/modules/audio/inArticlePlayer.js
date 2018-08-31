// @flow
import pauseBtn from 'svgs/journalism/in-article-audio-player/btn-pause.svg';
import playBtn from 'svgs/journalism/in-article-audio-player/btn-play.svg';
import { sendToOphan, formatTime } from './utils';

const updateProgressBar = percentPlayed => {
    const progressBar: ?HTMLElement = document.querySelector(
        '.inline-audio_content_progress-bar div.played'
    );
    if (progressBar) {
        progressBar.style.width = `${percentPlayed}%`;
    }
};

const updateTime = (el: HTMLElement, player) => {
    player.addEventListener('timeupdate', () => {
        el.textContent = formatTime(player.currentTime);
        const percentPlayed = (player.currentTime / player.duration) * 100;
        updateProgressBar(percentPlayed);
    });
};

const setPlayButton = el => {
    el.innerHTML = `<span>${playBtn.markup}</span>`;
};

const setPauseButton = el => {
    el.innerHTML = `<span>${pauseBtn.markup}</span>`;
};

const controlAudio = (el, player, id) => {
    el.addEventListener('click', () => {
        if (player.paused) {
            sendToOphan(id, 'play');
            player.play();
            setPauseButton(el);
        } else {
            player.pause();
            setPlayButton(el);
        }
    });
};

const scrubber = (el, player) => {
    const w = el.offsetWidth;
    const d = player.duration;
    el.addEventListener('click', (e: MouseEvent | Touch) => {
        const leftOffset = el.getBoundingClientRect().left;
        const clickX = e.clientX - leftOffset;
        const ratio = clickX / w;
        console.log('w', w, 'clickx', clickX, 'ratio', ratio);
        const selectedTime = d * ratio;
        player.currentTime = selectedTime;
        updateProgressBar(ratio * 100);
    });
};

const monitorPercentPlayed = (player, marker, id) => {
    const eventName = marker === 99 ? 'end' : marker.toLocaleString();

    player.addEventListener('timeupdate', function listener(e) {
        const percentPlayed = Math.round(
            (player.currentTime / player.duration) * 100
        );
        if (percentPlayed > marker) {
            sendToOphan(id, eventName);
            player.removeEventListener(e.type, listener);
        }
    });
};

const init = () => {
    const player = document.querySelector('audio.inline-audio-player-element');
    if (player && !(player instanceof HTMLMediaElement))
        throw new Error("Expected an 'audio' element.");

    const mediaId: ?string =
        player && player.hasAttribute('data-media-id')
            ? player.getAttribute('data-media-id')
            : '';
    const buttonDiv: ?HTMLElement = document.querySelector(
        '.inline-audio_button'
    );
    const scrubberBar: ?HTMLElement = document.querySelector(
        '.inline-audio_content_progress-bar'
    );
    const timePlayedSpan = document.querySelector('#inline-audio_time-played');

    if (player && mediaId && buttonDiv && scrubberBar && timePlayedSpan) {
        controlAudio(buttonDiv, player, mediaId);
        updateTime(timePlayedSpan, player);
        scrubber(scrubberBar, player);

        monitorPercentPlayed(player, 25, mediaId);
        monitorPercentPlayed(player, 50, mediaId);
        monitorPercentPlayed(player, 75, mediaId);
        monitorPercentPlayed(player, 99, mediaId);
    }
};

export { init };
