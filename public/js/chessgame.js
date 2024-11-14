const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
const messageElement = document.getElementById("message");
const currentPlayerElement = document.getElementById("currentPlayer");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let highlightedSquares = [];

const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";
  highlightedSquares = [];

  board.forEach((row, rowindex) => {
    row.forEach((square, squareindex) => {
      const squareElement = document.createElement("div");
      squareElement.classList.add(
        "square",
        (rowindex + squareindex) % 2 === 0 ? "light" : "dark"
      );

      squareElement.dataset.row = rowindex;
      squareElement.dataset.col = squareindex;

      if (square) {
        const pieceElement = document.createElement("img");
        pieceElement.src = getPieceSVG(square);
        pieceElement.classList.add("piece");
        pieceElement.draggable = playerRole === square.color;

        pieceElement.addEventListener("dragstart", (e) => {
          if (pieceElement.draggable) {
            draggedPiece = pieceElement;
            sourceSquare = { row: rowindex, col: squareindex };
            e.dataTransfer.setData("text/plain", "");
          }
        });

        pieceElement.addEventListener("click", () => {
          if (pieceElement.draggable) {
            highlightPossibleMoves(square, rowindex, squareindex);
          }
        });

        squareElement.appendChild(pieceElement);
      }

      squareElement.addEventListener("dragover", function (e) {
        e.preventDefault();
      });

      squareElement.addEventListener("drop", function (e) {
        e.preventDefault();
        if (draggedPiece) {
          const targetSource = {
            row: parseInt(squareElement.dataset.row),
            col: parseInt(squareElement.dataset.col),
          };

          handleMove(sourceSquare, targetSource);
        }
      });

      boardElement.appendChild(squareElement);
    });
  });

  if (playerRole === "b") {
    boardElement.classList.add("flipped");
  } else {
    boardElement.classList.remove("flipped");
  }
  currentPlayerElement.innerText = `Current Player: ${
    chess.turn() === "w" ? "White" : "Black"
  }`;
};

const highlightPossibleMoves = (piece, row, col) => {
  clearHighlights();

  const moves = chess.moves({
    square: `${String.fromCharCode(97 + col)}${8 - row}`,
    verbose: true,
  });

  moves.forEach((move) => {
    const targetRow = 8 - parseInt(move.to[1]);
    const targetCol = move.to[0].charCodeAt(0) - 97;

    const squareElement = boardElement.children[targetRow * 8 + targetCol];
    squareElement.classList.add("highlight");
    highlightedSquares.push(squareElement);

    const dot = document.createElement("div");
    dot.classList.add("dot");
    squareElement.appendChild(dot);
    dot.style.display = "block";
  });
};
const clearHighlights = () => {
  highlightedSquares.forEach((square) => {
    square.classList.remove("highlight");
    const dots = square.querySelectorAll(".dot");
    dots.forEach((dot) => dot.remove());
  });
  highlightedSquares = [];
};

const handleMove = (source, target) => {
  const move = {
    from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
    to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
    promotion: "q",
  };

  const result = chess.move(move);
  if (result) {
    socket.emit("move", move);
    renderBoard();
  } else {
    console.log("Invalid move");
  }
};

const getPieceSVG = (piece) => {
  const color = piece.color === "w" ? "w" : "b";
  const type = piece.type.toLowerCase();
  return `../pieces/${color}${type}.svg`;
};

socket.on("playerRole", function (role) {
  playerRole = role;
  renderBoard();
});

socket.on("spectatorRole", function () {
  playerRole = null;
  renderBoard();
});

socket.on("boardState", function (fen) {
  chess.load(fen);
  renderBoard();
  document.getElementById("currentPlayer").innerText = `Current Player: ${
    chess.turn() === "w" ? "White" : "Black"
  }`;
});

socket.on("move", function (move) {
  chess.move(move);
  renderBoard();
});

socket.on("gameOver", function (message) {
  alert(message);
});

document.getElementById("resetGame").addEventListener("click", () => {
  socket.emit("resetGame");
});

renderBoard();
