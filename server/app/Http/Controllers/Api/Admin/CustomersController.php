<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CustomersController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $per_page = request('perPage') ?: 10;

        $sort = request('sort') ?: ["column" => "id", "direction" => "desc"];

        $search = request('search') ?: '';

        $userId = request('filterItems.user_id') ?? request('user_id');
        $month  = request('filterItems.month') ?? request('month');
        $year   = request('filterItems.year') ?? request('year');

        $customers = Customer::with('user:id,code,name')
            ->when(
                $search,
                fn($query) =>
                $query->where(
                    fn($subQuery) =>
                    $subQuery->where("name", "like", "%{$search}%")
                        ->orWhere("address", "like", "%{$search}%")
                        ->orWhere("contact_number", "like", "%{$search}%")
                        ->orWhereHas(
                            "user",
                            fn($userQuery) =>
                            $userQuery->where("name", "like", "%{$search}%")
                                ->orWhere("code", "like", "%{$search}%")
                        )
                )
            )
            ->when($userId, fn($query) => $query->where('user_id', $userId))
            ->when($month, fn($query) => $query->whereMonth('created_at', $month))
            ->when($year, fn($query) => $query->whereYear('created_at', $year))
            ->orderBy($sort["column"], $sort["direction"])
            ->paginate($per_page);

        $data = async(fn() => [
            "data"  => $customers
        ]);

        return response()->json(await($data), 200);
    }

    public function index2()
    {
        $customers = Customer::query()
            ->where('user_id', Auth::id())
            ->select(['name', 'contact_number', 'address'])
            ->distinct()
            ->orderBy('name')
            ->get();

        return response()->json([
            'message' => 'Customers retrieved successfully.',
            'data'    => $customers
        ], 200);
    }

    public function export()
    {
        $search = request('search') ?: '';
        $userId = request('user_id');
        $month  = request('month');
        $year   = request('year');

        $customers = Customer::with('user:id,code,name')
            ->when(
                $search,
                fn($query) =>
                $query->where(
                    fn($subQuery) =>
                    $subQuery->where("name", "like", "%{$search}%")
                        ->orWhere("address", "like", "%{$search}%")
                        ->orWhere("contact_number", "like", "%{$search}%")
                        ->orWhereHas(
                            "user",
                            fn($userQuery) =>
                            $userQuery->where("name", "like", "%{$search}%")
                                ->orWhere("code", "like", "%{$search}%")
                        )
                )
            )
            ->when($userId, fn($query) => $query->where('user_id', $userId))
            ->when($month, fn($query) => $query->whereMonth('created_at', $month))
            ->when($year, fn($query) => $query->whereYear('created_at', $year))
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'message' => 'Customers exported successfully.',
            'data'    => $customers,
        ], 200);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
