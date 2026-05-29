import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export default function ComponentsShowcase() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-b from-mundial-navy to-mundial-navyLight p-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-12">
        <h1 className="text-4xl font-bold text-mundial-gold mb-2">
          Mundial 2026 - Componentes
        </h1>
        <p className="text-gray-300">
          Ejemplos de componentes con Framer Motion + shadcn/ui
        </p>
      </motion.div>

      {/* 1. CARDS */}
      <motion.section variants={itemVariants} className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">📇 Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {["Argentina", "Brasil", "Francia"].map((team, i) => (
            <motion.div
              key={team}
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-mundial-navyLight border-mundial-gold/30 hover:border-mundial-gold transition-all">
                <CardHeader>
                  <CardTitle className="text-mundial-gold">{team}</CardTitle>
                  <CardDescription className="text-gray-300">
                    Pronósticos de clasificación
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-300">
                      👥 Probabilidad: <span className="text-mundial-gold">85%</span>
                    </p>
                    <p className="text-sm text-gray-300">
                      🏆 Campeonato: <span className="text-mundial-gold">15%</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* 2. INPUT */}
      <motion.section variants={itemVariants} className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">📝 Input</h2>
        <Card className="bg-mundial-navyLight border-mundial-gold/30 p-6">
          <div className="space-y-4">
            <div>
              <label className="text-white text-sm font-medium">
                Buscar Equipo
              </label>
              <Input
                placeholder="Ej: Argentina, Brasil..."
                className="mt-2 bg-mundial-navy border-mundial-gold/30 text-white placeholder:text-gray-500"
              />
            </div>
            <div>
              <label className="text-white text-sm font-medium">
                Tu Pronóstico
              </label>
              <Input
                type="number"
                placeholder="Ingresa tu pronóstico..."
                className="mt-2 bg-mundial-navy border-mundial-gold/30 text-white placeholder:text-gray-500"
              />
            </div>
            <Button className="w-full bg-mundial-gold text-mundial-navy hover:bg-mundial-red">
              Guardar Pronóstico
            </Button>
          </div>
        </Card>
      </motion.section>

      {/* 3. TABS */}
      <motion.section variants={itemVariants} className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">📋 Tabs</h2>
        <Card className="bg-mundial-navyLight border-mundial-gold/30">
          <CardContent className="p-6">
            <Tabs defaultValue="groups" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-mundial-navy border border-mundial-gold/30">
                <TabsTrigger
                  value="groups"
                  className="text-white data-[state=active]:bg-mundial-gold data-[state=active]:text-mundial-navy"
                >
                  Grupos
                </TabsTrigger>
                <TabsTrigger
                  value="teams"
                  className="text-white data-[state=active]:bg-mundial-gold data-[state=active]:text-mundial-navy"
                >
                  Equipos
                </TabsTrigger>
                <TabsTrigger
                  value="predictions"
                  className="text-white data-[state=active]:bg-mundial-gold data-[state=active]:text-mundial-navy"
                >
                  Predicciones
                </TabsTrigger>
              </TabsList>

              <TabsContent value="groups" className="mt-4 text-gray-300">
                <p>Aquí irán los grupos del mundial 2026</p>
              </TabsContent>
              <TabsContent value="teams" className="mt-4 text-gray-300">
                <p>Aquí irán los equipos participantes</p>
              </TabsContent>
              <TabsContent value="predictions" className="mt-4 text-gray-300">
                <p>Aquí irán tus predicciones</p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.section>

      {/* 4. TABLE */}
      <motion.section variants={itemVariants} className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">📊 Table</h2>
        <Card className="bg-mundial-navyLight border-mundial-gold/30 overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-mundial-navy border-b border-mundial-gold/30">
                <TableRow>
                  <TableHead className="text-mundial-gold">Pos</TableHead>
                  <TableHead className="text-mundial-gold">Equipo</TableHead>
                  <TableHead className="text-mundial-gold">Puntos</TableHead>
                  <TableHead className="text-mundial-gold">PJ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { pos: 1, team: "Argentina", pts: 9, pj: 3 },
                  { pos: 2, team: "Brasil", pts: 6, pj: 3 },
                  { pos: 3, team: "Francia", pts: 3, pj: 3 },
                ].map((row) => (
                  <motion.tr
                    key={row.team}
                    whileHover={{ backgroundColor: "rgba(255, 215, 0, 0.1)" }}
                    className="border-b border-mundial-gold/20 hover:bg-mundial-gold/5"
                  >
                    <TableCell className="text-mundial-gold font-bold">
                      {row.pos}
                    </TableCell>
                    <TableCell className="text-white">{row.team}</TableCell>
                    <TableCell className="text-mundial-gold">{row.pts}</TableCell>
                    <TableCell className="text-gray-300">{row.pj}</TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.section>

      {/* 5. DIALOG */}
      <motion.section variants={itemVariants}>
        <h2 className="text-2xl font-bold text-white mb-6">🔔 Dialog</h2>
        <Card className="bg-mundial-navyLight border-mundial-gold/30 p-6">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-mundial-gold text-mundial-navy hover:bg-mundial-red">
                Abrir Modal
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-mundial-navyLight border-mundial-gold/30">
              <DialogHeader>
                <DialogTitle className="text-mundial-gold">
                  Confirmar tu Pronóstico
                </DialogTitle>
                <DialogDescription className="text-gray-300">
                  ¿Estás seguro de que quieres enviar estos pronósticos?
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-4 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="border-mundial-gold/30 text-mundial-gold hover:bg-mundial-gold/10"
                >
                  Cancelar
                </Button>
                <Button className="bg-mundial-gold text-mundial-navy hover:bg-mundial-red">
                  Confirmar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </Card>
      </motion.section>
    </motion.div>
  );
}
