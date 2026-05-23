const express = require('express');
const pool = require('./db');
const connectMongoDB = require("./mongoConnection");
const Vehiculo = require("./Vehiculo");

const app = express();
app.use(express.json());

connectMongoDB();

app.get('/', (req, res) => {
  res.status(200).json({ message: "API funcionando correctamente" });
});

// ============================================================================
//     ENDPOINTS DE ALUMNOS
// ============================================================================

// 1. Obtiene la lista de todos los alumnos que están activos en el sistema (is_active = true)
app.get('/api/getAlumnos', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM alumno WHERE is_active = true');
    res.status(200).json({
      message: "Alumnos consultados correctamente",
      data: resultado.rows
    });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor al consultar alumnos", error: error.message });
  }
});

// 2. Busca un alumno específico por su ID, validando que sea numérico y que el alumno esté activo
app.get('/api/getAlumnoById/:id', async (req, res) => {
  try {
    const { id } = req.params;
// Validación: Que sea numérico
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "El ID del alumno debe ser numérico y obligatorio" });
    }

    const resultado = await pool.query('SELECT * FROM alumno WHERE id = $1 AND is_active = true', [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ message: "Alumno no encontrado o se encuentra inactivo" });
    }

    res.status(200).json({
      message: "Alumno encontrado correctamente",
      data: resultado.rows[0]
    });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor al obtener el alumno", error: error.message });
  }
});

// 3. Busca alumnos cuyo nombre o apellido coincida parcialmente con el texto usando LIKE
app.get('/api/searchAlumno', async (req, res) => {
  try {
    const { query } = req.query;
// Validación: Que exista la query de búsqueda y no esté vacía
    if (!query || query.trim() === "") {
      return res.status(400).json({ message: "El parámetro de búsqueda 'query' es obligatorio y no puede ir vacío" });
    }
// Búsqueda insensible a mayúsculas/minúsculas usando ILIKE (o LIKE con % de coincidencia parcial)
    const busqueda = `%${query}%`;
    const resultado = await pool.query(
      'SELECT * FROM alumno WHERE (nombre ILIKE $1 OR apellido ILIKE $1) AND is_active = true',
      [busqueda]
    );

    res.status(200).json({
      message: `Búsqueda completada para: '${query}'`,
      data: resultado.rows
    });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor durante la búsqueda", error: error.message });
  }
});

// 4. Registra un nuevo alumno en la base de datos con estado activo por defecto
app.post('/api/createAlumno', async (req, res) => {
  try {
    const { nombre, apellido, edad, correo } = req.body;
// Validación: Campos obligatorios y tipos de datos básicos
    if (!nombre || !apellido || !edad || !correo) {
      return res.status(400).json({ message: "Todos los campos (nombre, apellido, edad, correo) son obligatorios" });
    }
    if (isNaN(edad)) {
      return res.status(400).json({ message: "La edad debe ser un valor numérico" });
    }

    const resultado = await pool.query(
      'INSERT INTO alumno (nombre, apellido, edad, correo, is_active) VALUES ($1, $2, $3, $4, true) RETURNING *',
      [nombre, apellido, edad, correo]
    );

    res.status(201).json({
      message: "Alumno creado correctamente",
      data: resultado.rows[0]
    });
  } catch (error) {
    res.status(500).json({ message: "Error al crear el alumno", error: error.message });
  }
});

// 5. Actualiza los datos de un alumno existente basándose en su ID y validando que esté activo
app.put('/api/updateAlumno/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, edad, correo } = req.body;
// Validaciones de ID
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "El ID provisto debe ser numérico" });
    }
    if (!nombre || !apellido || !edad || !correo) {
      return res.status(400).json({ message: "Faltan datos en el cuerpo para realizar la modificación" });
    }
// Verificar existencia del alumno activo
    const verificar = await pool.query('SELECT * FROM alumno WHERE id = $1 AND is_active = true', [id]);
    if (verificar.rows.length === 0) {
      return res.status(404).json({ message: "El alumno no existe o está inactivo" });
    }
// Actualización de datos
    const resultado = await pool.query(
      'UPDATE alumno SET nombre = $1, apellido = $2, edad = $3, correo = $4 WHERE id = $5 RETURNING *',
      [nombre, apellido, edad, correo, id]
    );

    res.status(200).json({
      message: "Alumno modificado correctamente",
      data: resultado.rows[0]
    });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar datos del alumno", error: error.message });
  }
});

// 6. Desactiva a un alumno del sistema (baja lógica) cambiando su estado 'is_active' a false sin borrarlo de la BD
app.delete('/api/deleteAlumno/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "El ID debe ser numérico" });
    }
// Validar si el alumno existe y sigue activo
    const verificar = await pool.query('SELECT * FROM alumno WHERE id = $1 AND is_active = true', [id]);
    if (verificar.rows.length === 0) {
      return res.status(404).json({ message: "El alumno no existe o ya ha sido eliminado previamente" });
    }
// Eliminación lógica cambiando is_active a false
    await pool.query('UPDATE alumno SET is_active = false WHERE id = $1', [id]);

    res.status(200).json({
      message: "Alumno eliminado correctamente (Baja lógica realizada)"
    });
  } catch (error) {
    res.status(500).json({ message: "Error al procesar la eliminación lógica", error: error.message });
  }
});

// ============================================================================
//     ENDPOINTS DE MATERIAS
// ============================================================================

// 1. Obtiene el catálogo completo de todas las materias registradas ordenadas por ID
app.get('/api/getMaterias', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM materia ORDER BY id ASC');
    res.status(200).json({
      message: "Materias consultadas correctamente",
      data: resultado.rows
    });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener las materias", error: error.message });
  }
});

// 2. Registra una nueva materia en el catálogo validando sus campos obligatorios y numéricos
app.post('/api/createMateria', async (req, res) => {
  try {
    const { nombre, semestre, creditos } = req.body;
// Validación de campos obligatorios
    if (!nombre || nombre.trim() === "") {
      return res.status(400).json({ message: "El nombre de la materia es requerido y no puede ir vacío" });
    }
    if (!semestre || !creditos || isNaN(creditos)) {
      return res.status(400).json({ message: "El semestre y los créditos (numéricos) son requeridos" });
    }

    const resultado = await pool.query(
      'INSERT INTO materia (nombre, semestre, creditos) VALUES ($1, $2, $3) RETURNING *',
      [nombre, semestre, creditos]
    );

    res.status(201).json({
      message: "Materia creada correctamente",
      data: resultado.rows[0]
    });
  } catch (error) {
    res.status(500).json({ message: "Error al registrar la materia", error: error.message });
  }
});

// ============================================================================
//     ENDPOINTS DE MATERIAS
// ============================================================================

// 1. Obtiene el catálogo completo de todas las materias registradas ordenadas por ID
app.get('/api/getMaterias', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM materia ORDER BY id ASC');
    res.status(200).json({
      message: "Materias consultadas correctamente",
      data: resultado.rows
    });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener las materias", error: error.message });
  }
});

// 2. Registra una nueva materia en el catálogo validando sus campos obligatorios y numéricos
app.post('/api/createMateria', async (req, res) => {
  try {
    const { nombre, semestre, creditos } = req.body;
// Validación de campos obligatorios
    if (!nombre || nombre.trim() === "") {
      return res.status(400).json({ message: "El nombre de la materia es requerido y no puede ir vacío" });
    }
    if (!semestre || !creditos || isNaN(creditos)) {
      return res.status(400).json({ message: "El semestre y los créditos (numéricos) son requeridos" });
    }

    const resultado = await pool.query(
      'INSERT INTO materia (nombre, semestre, creditos) VALUES ($1, $2, $3) RETURNING *',
      [nombre, semestre, creditos]
    );

    res.status(201).json({
      message: "Materia creada correctamente",
      data: resultado.rows[0]
    });
  } catch (error) {
    res.status(500).json({ message: "Error al registrar la materia", error: error.message });
  }
});

// 3. Cuenta la cantidad total de materias asignadas a un alumno usando la función agregada COUNT de SQL
app.get('/api/getMateriasCountByAlumnoId/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "El ID provisto no es numérico" });
    }
// Verificar estatus del alumno
    const alumnoCheck = await pool.query('SELECT * FROM alumno WHERE id = $1 AND is_active = true', [id]);
    if (alumnoCheck.rows.length === 0) {
      return res.status(404).json({ message: "El alumno solicitado no existe o no está activo" });
    }
// Contar registros asociados en la tabla intermedia
    const resultado = await pool.query(
      'SELECT COUNT(*)::INT as total_materias FROM alumno_materia WHERE alumno_id = $1',
      [id]
    );

    res.status(200).json({
      message: "Conteo de materias realizado con éxito",
      data: {
        total_materias: resultado.rows[0].total_materias
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Error al calcular el conteo de materias", error: error.message });
  }
});

// ============================================================================
//     ENDPOINTS DE VEHÍCULOS (MongoDB usando el ODM Mongoose)
// ============================================================================

// 1. Obtiene todos los documentos guardados dentro de la colección de vehículos en MongoDB
app.get("/api/getVehiculos", async (req, res) => {
  try {
    const vehiculos = await Vehiculo.find();
    res.status(200).json({
      message: "Vehículos consultados correctamente desde MongoDB",
      data: vehiculos,
    });
  } catch (error) {
    res.status(500).json({ message: "Error al consultar la colección de vehículos", error: error.message });
  }
});