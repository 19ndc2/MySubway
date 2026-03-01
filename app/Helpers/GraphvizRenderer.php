<?php

namespace App\Helpers;

class GraphvizRenderer
{
    /**
     * Generate Graphviz DOT content from transit JSON
     */
    public static function render(array $json)
    {
        $splitLongName = function($name, $maxCharsPerLine = 15) {
            if (strlen($name) <= $maxCharsPerLine) {
                return $name;
            }

            // Try to split at word boundaries
            $words = explode(' ', $name);
            $line1 = '';
            $line2 = '';

            for ($i = 0; $i < count($words); $i++) {
                if (strlen($line1 . ' ' . $words[$i]) <= $maxCharsPerLine && $line2 === '') {
                    $line1 .= ($line1 ? ' ' : '') . $words[$i];
                } else {
                    $line2 .= ($line2 ? ' ' : '') . $words[$i];
                }
            }

            return $line1 . "\n" . $line2;
        };

        // 1. Setup the Graph for Schematic Look
        $dot = "graph transit_map {\n";
        $dot .= "  layout=neato;\n";
        $dot .= "  splines=false;\n";
        $dot .= "  outputorder=\"edgesfirst\";\n";
        $dot .= "  overlap=scale;\n";
        $dot .= "  pad=0.5;\n";

        $dot .= "  node [shape=circle, style=filled, fillcolor=white, width=0.2, penwidth=2, fontsize=12, fontname=\"Helvetica, Arial, sans-serif\"];\n";
        $dot .= "  edge [penwidth=6];\n";

        $stationDefinitions = [];

        // 2. Add Edges (Lines)
        foreach ($json['lines'] as $line) {
            $stations = $line['stations'];
            $color = $line['color'] ?? "#000000";

            for ($i = 0; $i < count($stations) - 1; $i++) {
                $a = addslashes($stations[$i]['name']);
                $b = addslashes($stations[$i + 1]['name']);

                // Draw the edge
                $dot .= "  \"$a\" -- \"$b\" [color=\"$color\"];\n";

                // Collect positions as we go
                $stationDefinitions[$stations[$i]['name']] = $stations[$i];
                $stationDefinitions[$stations[$i + 1]['name']] = $stations[$i + 1];
            }
        }

        // 3. Add Nodes with FIXED, NON-RANDOM positions
        foreach ($stationDefinitions as $name => $coords) {
            $stationEscaped = addslashes($name);
            $splitName = addslashes($splitLongName($name));

            $x = $coords['x'] / 64;
            $y = ($coords['y'] / 64) * -1;

            $labelPos = $coords['label_position'] ?? 'right';

            $labelAngle = 0;
            $labelDistance = 1.8;

            if ($labelPos === 'left') {
                $labelAngle = 180;
            } elseif ($labelPos === 'top') {
                $labelAngle = 90;
            } elseif ($labelPos === 'bottom') {
                $labelAngle = 270;
            }

            $dot .= "  \"$stationEscaped\" [pos=\"$x,$y!\", label=\"\", xlabel=\"$splitName\", labelangle=$labelAngle, labeldistance=$labelDistance];\n";
        }

        $dot .= "}\n";

        return $dot;
    }

    /**
     * Convert DOT string to SVG using Graphviz (piped, no intermediate files)
     */
    public static function dotToSvg($dotContent)
    {
        $cmd = "neato -Tsvg";

        $process = proc_open($cmd, [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w']
        ], $pipes);

        if (!is_resource($process)) {
            throw new \Exception("Failed to execute Graphviz");
        }

        fwrite($pipes[0], $dotContent);
        fclose($pipes[0]);

        $output = stream_get_contents($pipes[1]);
        $errors = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $returnCode = proc_close($process);

        if ($returnCode !== 0) {
            throw new \Exception("Graphviz Error: " . $errors);
        }

        return $output;
    }
}