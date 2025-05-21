//#region Helper functions

/**
 * @param {number} min
 * @param {number} max
 */
function randomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * @param {Array} array
 */
function shuffle(array) {
    let currentIndex = array.length;

    while (currentIndex != 0) {
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
}

/**
 * @param {number} ms
 * @param {(value: any) => void} callback
 */
function delay(ms, callback) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(callback);
        }, ms);
    });
}

//#endregion

/**
 * @typedef Pokemon
 * @property {string} photo
 * @property {string} name
 * @property {id} number
 * @property {boolean} solved
 */
class Game {
    //#region Game Variables

    /** @type {number | null} */
    interval = null;

    /** @type {Date | null} */
    endingTime = null;

    /** @type {number} */
    duration;

    /** @type {Pokemon[]} */
    pokemons;

    /** @type {string} */
    difficultyName;

    /** @type {(number | null)[]} */
    grid;

    /** @type {number} */
    score;

    firstSelect;

    secondSelect;

    disableClick;

    clickCount;

    //#endregion

    //#region Private Variables

    hideStyle = ["rotate-y-180"];

    //#endregion

    startGame() {
        // Set up the timer
        this.endingTime = new Date();
        this.endingTime.setTime(this.endingTime.getTime() + this.duration * 1000);
        this.interval = setInterval(() => {
            this.updateGame();
        }, 1000);

        // Set up the grid
        const gameGrid = document.getElementById("gameGrid");
        gameGrid.className = `grid grid-cols-4 auto-rows-fr items-center gap-4`;

        for (const [index, value] of this.grid.entries()) {
            gameGrid.appendChild(this.#createCard(value, index));
        }
        this.#setupCards();

        // Setup the score
        this.score = 0;

        // Setup click count
        this.clickCount = 0;
    }

    updateGame() {
        // Remaining Time
        const currentTime = new Date().getTime();
        const remainingTime = this.endingTime.getTime() - currentTime;

        // Display Remaining Time
        const timerSpan = document.getElementById("timer");
        timerSpan.textContent = `${Math.round(remainingTime / 1000)} seconds left`;

        // End the game
        if (this.score == this.pokemons.length || remainingTime <= 0) this.endGame();

        this.#updateHeader();
    }

    endGame() {
        // Determine result
        if (this.score == this.pokemons.length) this.#gameWin();
        else this.#gameLose();

        this.quitGame();
    }

    quitGame() {
        // Clear the game variable
        game = undefined;
        window.dispatchEvent(eventSceneChanged);

        // Clear the gameGrid
        const gameGrid = document.getElementById("gameGrid");
        gameGrid.innerHTML = "";

        // Clear the interval
        clearInterval(this.interval);
    }

    static async createGame(numPokemons, timeDuration, difficultyName) {
        const game = new Game();

        game.pokemons = await Game.#genRandomPokemons(numPokemons);
        game.grid = game.#genGrid();
        game.duration = timeDuration;
        game.difficultyName = difficultyName;

        return game;
    }

    //#region Private

    #updateHeader() {
        const details = document.getElementById("details");
        details.textContent = `${this.score}/${this.pokemons.length} pairs to match | Clicked ${this.clickCount} times`;
    }

    #gameWin() {
        const currentTime = new Date().getTime();
        const remainingTime = this.endingTime.getTime() - currentTime;

        logs.push({
            matchedAll: true,
            duration: this.duration,
            pairsToMatch: this.pokemons.length,
            difficultyName: this.difficultyName,
            timeRemaining: Math.round(remainingTime / 1000),
            dateCompleted: new Date(),
        });
    }

    #gameLose() {
        const currentTime = new Date().getTime();
        const remainingTime = this.endingTime.getTime() - currentTime;

        logs.push({
            matchedAll: false,
            duration: this.duration,
            pairsToMatch: this.pokemons.length,
            difficultyName: this.difficultyName,
            timeRemaining: Math.round(remainingTime / 1000),
            dateCompleted: new Date(),
        });
    }

    #createCard(pokemonIndex, gridIndex) {
        const card = document.createElement("div");
        const frontFace = card.appendChild(document.createElement("div"));
        const backFace = card.appendChild(document.createElement("div"));
        const img = frontFace.appendChild(document.createElement("img"));
        const name = frontFace.appendChild(document.createElement("p"));
        const backImg = backFace.appendChild(document.createElement("img"));

        card.className =
            "card rotate-y-180 size-full transition transform-3d *:p-4 *:rounded *:border";
        card.id = "cardIndex-" + gridIndex;

        frontFace.className =
            "*:block flex flex-col justify-center bg-white size-full dark:bg-black backface-hidden";
        backFace.className =
            "*:block bg-white dark:bg-black rotate-y-180 size-full backface-hidden absolute top-0 left-0 flex flex-col justify-center";

        img.className = "aspect-square";
        img.src = this.pokemons[pokemonIndex].photo;

        backImg.className = "aspect-square";
        backImg.src = "back.webp";

        name.className = "text-xl text-center font-bold capitalize";
        name.textContent = this.pokemons[pokemonIndex].name;

        return card;
    }

    /**
     * @param {HTMLElement} selectionElement
     */
    #getIndexFromCardElement(selectionElement) {
        let [name, index] = selectionElement.id.split("-");
        if (!name == "cardIndex") throw new Error("Numbered id is not associated to cardIndex");
        return parseInt(index);
    }

    #processCards() {
        let firstPokemonValue = this.grid[this.#getIndexFromCardElement(this.firstSelect)];
        let secondPokemonValue = this.grid[this.#getIndexFromCardElement(this.secondSelect)];

        if (
            firstPokemonValue != null &&
            secondPokemonValue != null &&
            firstPokemonValue == secondPokemonValue
        ) {
            this.score++;

            this.grid[this.#getIndexFromCardElement(this.firstSelect)] = null;
            this.grid[this.#getIndexFromCardElement(this.secondSelect)] = null;

            this.firstSelect = undefined;
            this.secondSelect = undefined;
        } else {
            this.disableClick = true;

            setTimeout(() => {
                this.#hideFirstCard();
                this.#hideSecondCard();
                this.disableClick = false;
            }, 1000);
        }
    }

    #hideFirstCard() {
        this.firstSelect.classList.add(...this.hideStyle);
        this.firstSelect = undefined;
    }

    #hideSecondCard() {
        this.secondSelect.classList.add(...this.hideStyle);
        this.secondSelect = undefined;
    }

    #showFirstCard(currentTarget) {
        this.firstSelect = currentTarget;
        this.firstSelect.classList.remove(...this.hideStyle);
    }

    #showSecondCard(currentTarget) {
        this.secondSelect = currentTarget;
        this.secondSelect.classList.remove(...this.hideStyle);
    }

    #setupCards() {
        $(".card").on("click", ({ currentTarget }) => {
            if (this.disableClick) return;
            if (this.grid[this.#getIndexFromCardElement(currentTarget)] == null) return;

            if (!this.firstSelect && this.secondSelect) {
                this.firstSelect = this.secondSelect;
                this.secondSelect = undefined;
            }

            if (!this.firstSelect && !this.secondSelect) this.#showFirstCard(currentTarget);
            else if (this.firstSelect && !this.secondSelect) {
                if (this.firstSelect == currentTarget) this.#hideFirstCard();
                else this.#showSecondCard(currentTarget);
            }

            if (this.firstSelect && this.secondSelect) this.#processCards();

            console.log(this.firstSelect, this.secondSelect);
            this.clickCount++;
        });
    }

    #genGrid() {
        const grid = [];
        this.pokemons.forEach((_, index) => grid.push(index, index));
        shuffle(grid);
        return grid;
    }

    static async #genRandomPokemons(numPokemons, start = 1, end = 512) {
        if (numPokemons > end - start + 1) numPokemons = end - start + 1;

        const pokemons = [];

        for (let i = 0; i < numPokemons; i++) {
            /** @type {Pokemon} */
            const pokemon = await fetch(
                "https://pokeapi.co/api/v2/pokemon/" + randomInt(start, end)
            )
                .then((res) => {
                    return res.json();
                })
                .then(async (json) => {
                    return {
                        photo: json.sprites.other["official-artwork"]["front_default"],
                        name: json.name,
                        id: json.id,
                        solved: false,
                    };
                });

            pokemons.push(pokemon);
        }

        return pokemons;
    }

    //#endregion
}

/** @type {Game | undefined} */
var game;

/** @type {an   y[]} */
var logs = [];

const eventSceneChanged = new CustomEvent("sceneChanged", {
    scene: game ? "game" : "gameSetup",
});

window.addEventListener("sceneChanged", () => {
    const gameSetupScene = document.getElementById("gameSetup");
    const gameScene = document.getElementById("game");

    if (game) {
        gameSetupScene.classList.add("hidden");
        gameScene.classList.remove("hidden");
    } else {
        gameScene.classList.add("hidden");
        gameSetupScene.classList.remove("hidden");
        updateLogs();
    }

    console.log(game);
});

function updateLogs() {
    const gameLogsDiv = document.getElementById("gameLogs");
    gameLogsDiv.innerHTML = "";

    for (let i = logs.length - 1; i >= 0; i--) {
        const log = logs[i];

        const recordDiv = gameLogsDiv.appendChild(document.createElement("div"));
        const result = recordDiv.appendChild(document.createElement("h5"));
        const gameSetting = recordDiv.appendChild(document.createElement("p"));
        const timeRemaining = recordDiv.appendChild(document.createElement("p"));
        const dateCompleted = recordDiv.appendChild(document.createElement("code"));

        recordDiv.classList.add("p-2", "border", "rounded");
        result.classList.add("text-2xl", "font-bold");
        gameSetting.classList.add("text-lg", "italics");
        timeRemaining.classList.add("text-lg", "italics");
        dateCompleted.classList.add("text-sm", "font-mono");

        result.textContent = log.matchedAll ? "Won" : "Lost";
        gameSetting.textContent = `${log.difficultyName} | ${log.duration} s | ${log.pairsToMatch} pairs to match`;
        timeRemaining.textContent =
            log.timeRemaining > 0
                ? `Completed with ${log.timeRemaining} s to spare!`
                : "Incomplete time";
        dateCompleted.textContent = log.dateCompleted.toString();
    }
}

$(document).ready(() => {
    //#region Elements

    const startGameButton = document.getElementById("startGame");
    const endGameButton = document.getElementById("endGame");

    //#endregion

    startGameButton.addEventListener("click", async () => {
        let difficulty = document.querySelector('input[name="difficulty"]:checked').value;

        switch (parseInt(difficulty)) {
            case 0:
                game = await Game.createGame(4, 30, "Easy");
                break;
            case 1:
                game = await Game.createGame(6, 45, "Medium");
                break;
            case 2:
                game = await Game.createGame(8, 45, "Hard");
                break;
            case 3:
                game = await Game.createGame(8, 30, "Insane");
                break;
        }

        game.startGame();

        window.dispatchEvent(eventSceneChanged);
    });

    endGameButton.addEventListener("click", () => {
        if (game) game.quitGame();
    });

    window.dispatchEvent(eventSceneChanged);
});
