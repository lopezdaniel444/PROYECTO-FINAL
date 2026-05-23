const mongoose = require("mongoose");

const vehiculoSchema = new mongoose.Schema({
  marca: {
    type: String,
    required: true,
  },
  modelo: {
    type: String,
    required: true,
  },
  anio: {
    type: Number,
    required: true,
  },
  color: {
    type: String,
    required: true,
  },
});

const Vehiculo = mongoose.model("Vehiculo", vehiculoSchema);

module.exports = Vehiculo;